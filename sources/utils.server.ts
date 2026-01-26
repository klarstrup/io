import { DeleteResult, ObjectId, UpdateResult } from "mongodb";
import type { Session } from "next-auth";
import PartySocket from "partysocket";
import { sourceToMaterializer } from "../app/api/materialize_workouts/materializers";
import { Users } from "../models/user.server";
import type { DataSource, UserDataSource } from "./utils";

export type SetUpdatedFn = (
  updated:
    | boolean
    | Pick<UpdateResult, "matchedCount" | "modifiedCount" | "upsertedCount">
    | Pick<DeleteResult, "deletedCount">,
) => void;

export async function* wrapSources<
  S extends DataSource,
  DS extends UserDataSource & { source: S },
  T,
>(
  user: Session["user"],
  source: S,
  fn: (dataSource: DS, setUpdated: SetUpdatedFn) => AsyncGenerator<T>,
) {
  const dataSources = (user.dataSources ?? []).filter(
    (ds): ds is DS => ds.source === source,
  );
  for (const dataSource of dataSources) {
    const filter = { _id: new ObjectId(user.id) };
    const updateOptions = { arrayFilters: [{ "source.id": dataSource.id }] };

    const attemptedAt = new Date();
    let updatedDatabase: boolean | null | undefined | void = null;
    await Users.updateOne(
      filter,
      { $set: { "dataSources.$[source].lastAttemptedAt": attemptedAt } },
      updateOptions,
    );
    try {
      yield* fn(dataSource, (updated) => {
        if (typeof updated !== "boolean") {
          if ("modifiedCount" in updated) {
            updatedDatabase ||=
              updated.modifiedCount > 0 || updated.upsertedCount > 0;
          } else {
            updatedDatabase ||= updated.deletedCount > 0;
          }
        } else {
          updatedDatabase ||= updated;
        }

        return updatedDatabase;
      });

      const successfulAt = new Date();
      await Users.updateOne(
        filter,
        {
          $set: {
            "dataSources.$[source].lastSuccessfulAt": successfulAt,
            "dataSources.$[source].lastSuccessfulRuntime":
              successfulAt.valueOf() - attemptedAt.valueOf(),
            "dataSources.$[source].lastResult": "success",
          },
        },
        updateOptions,
      );
    } catch (e) {
      const failedAt = new Date();
      await Users.updateOne(
        filter,
        {
          $set: {
            "dataSources.$[source].lastFailedAt": failedAt,
            "dataSources.$[source].lastFailedRuntime":
              failedAt.valueOf() - attemptedAt.valueOf(),
            "dataSources.$[source].lastError": String(e),
            "dataSources.$[source].lastResult": "failure",
          },
        },
        updateOptions,
      );
      throw e;
    } finally {
      const materializer =
        sourceToMaterializer[
          dataSource.source as keyof typeof sourceToMaterializer
        ];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - some runtimes think this is too complex
      if (materializer) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - some runtimes think this is too complex
        yield* materializer?.(user, dataSource);
      }

      if (updatedDatabase !== false) {
        try {
          const socket = new PartySocket({
            // id: process.env.VERCEL_DEPLOYMENT_ID,
            host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
            room: user.id,
          });
          socket.send(
            JSON.stringify({
              source: dataSource.source,
              scrapedAt: new Date().valueOf(),
            }),
          );
          socket.close();
        } catch (error) {
          console.error(error);
        }
      }
    }
  }
}
