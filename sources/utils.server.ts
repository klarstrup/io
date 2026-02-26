import { DeleteResult, ObjectId, UpdateResult } from "mongodb";
import type { Session } from "next-auth";
import PartySocket from "partysocket";
import { sourceToMaterializer } from "../app/api/materialize_workouts/materializers";
import { Users } from "../models/user.server";
import {
  updateExerciseCounts,
  updateLocationCounts,
} from "../models/workout.server";
import { shuffle } from "../utils";
import type { DataSource, UserDataSource } from "./utils";

export type SetUpdatedFn = (
  updated:
    | boolean
    | Pick<UpdateResult, "matchedCount" | "modifiedCount" | "upsertedCount">
    | Pick<DeleteResult, "deletedCount">,
) => void;

// TODO: Allow this to run in parallel for certain data sources, for example iCal feeds, wh
export async function* wrapSources<S extends DataSource, T>(
  user: Session["user"],
  source: S,
  fn: (
    dataSource: UserDataSource & { source: S },
    setUpdated: SetUpdatedFn,
  ) => AsyncGenerator<T>,
) {
  // Randomize the order of data sources to improve scraping coverage for users with many data sources
  // TODO: Let a source be prioritized, for example if it hasn't been scraped in a while, maybe by URL
  const dataSources = shuffle(
    (user.dataSources ?? [])
      .filter(
        (ds): ds is UserDataSource & { source: S } => ds.source === source,
      )
      .filter((dataSource) => !dataSource.paused),
  );

  for (const dataSource of dataSources) {
    const filter = { _id: new ObjectId(user.id) };
    const updateOptions = { arrayFilters: [{ "source.id": dataSource.id }] };

    const attemptedAt = new Date();
    let updatedDatabase: boolean | null | undefined = null;
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

        await Promise.all([
          updateLocationCounts(user.id),
          updateExerciseCounts(user.id),
        ]);
      }

      if (updatedDatabase !== false) {
        try {
          await new Promise((y, n) => {
            const socket = new PartySocket({
              // id: process.env.VERCEL_DEPLOYMENT_ID,
              host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
              room: user.id,
            });
            socket.onopen = () => {
              socket.send(
                JSON.stringify({
                  source: dataSource.source,
                  scrapedAt: new Date().valueOf(),
                }),
              );
              socket.close();
              y(undefined);
            };
            socket.onerror = (err) => n(err.error);
          });
        } catch (error) {
          console.error(error);
        }
      }
    }
  }
}
