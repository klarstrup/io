import { ObjectId } from "mongodb";
import type { Session } from "next-auth";
import { sourceToMaterializer } from "../app/api/materialize_workouts/materializers";
import { Users } from "../models/user.server";
import type { UserDataSource } from "./utils";

export async function* wrapSource<DS extends UserDataSource, T, TReturn, TNext>(
  dataSource: DS,
  user: Session["user"],
  fn: (config: DS["config"]) => AsyncGenerator<T, TReturn, TNext>,
) {
  const filter = { _id: new ObjectId(user.id) };
  const updateOptions = { arrayFilters: [{ "source.id": dataSource.id }] };

  const attemptedAt = new Date();
  await Users.updateOne(
    filter,
    { $set: { "dataSources.$[source].lastAttemptedAt": attemptedAt } },
    updateOptions,
  );
  try {
    yield* fn(dataSource.config);

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
  }

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
}
