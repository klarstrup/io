import { ObjectId } from "mongodb";
import type { Session } from "next-auth";
import PartySocket from "partysocket";
import { sourceToMaterializer } from "../app/api/materialize_workouts/materializers";
import { Users } from "../models/user.server";
import type { DataSource, UserDataSource } from "./utils";

export async function* wrapSources<
  S extends DataSource,
  DS extends UserDataSource & { source: S },
  T,
>(
  source: S,
  dataSources: UserDataSource[],
  user: Session["user"],
  fn: (
    dataSource: DS,
    setUpdated: (updated: boolean) => void,
  ) => AsyncGenerator<T>,
) {
  for (const dataSource of dataSources) {
    if (dataSource.source !== source) continue;

    yield* wrapSource(dataSource, user, (_config, setUpdated) =>
      fn(dataSource as DS, setUpdated),
    );
  }
}
export async function* wrapSource<DS extends UserDataSource, T>(
  dataSource: DS,
  user: Session["user"],
  fn: (
    config: DS["config"],
    setUpdated: (updated: boolean) => void,
  ) => AsyncGenerator<T>,
) {
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
    yield* fn(dataSource.config, (updated) => (updatedDatabase ||= updated));

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
        new PartySocket({
          id: process.env.VERCEL_DEPLOYMENT_ID,
          host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
          room: user.id,
        }).send(
          JSON.stringify({
            source: dataSource.source,
            scrapedAt: new Date().valueOf(),
          }),
        );
      } catch (error) {
        console.error(error);
      }
    }
  }
}
