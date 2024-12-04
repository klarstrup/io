import { ObjectId } from "mongodb";
import { Session } from "next-auth";
import { Users } from "../models/user.server";
import { UserDataSource } from "./utils";

export async function* wrapSource<T, TReturn, TNext>(
  dataSource: UserDataSource,
  user: Session["user"],
  fn: () => AsyncGenerator<T, TReturn, TNext>,
) {
  const attemptedAt = new Date();
  await Users.updateOne(
    { _id: new ObjectId(user.id) },
    { $set: { "dataSources.$[source].lastAttemptedAt": attemptedAt } },
    { arrayFilters: [{ "source.id": dataSource.id }] },
  );
  try {
    yield* fn();

    const successfulAt = new Date();
    await Users.updateOne(
      { _id: new ObjectId(user.id) },
      {
        $set: {
          "dataSources.$[source].lastSuccessfulAt": successfulAt,
          "dataSources.$[source].lastSuccessfulRuntime":
            successfulAt.valueOf() - attemptedAt.valueOf(),
          "dataSources.$[source].lastResult": "success",
        },
      },
      { arrayFilters: [{ "source.id": dataSource.id }] },
    );
  } catch (e) {
    const failedAt = new Date();
    await Users.updateOne(
      { _id: new ObjectId(user.id) },
      {
        $set: {
          "dataSources.$[source].lastFailedAt": failedAt,
          "dataSources.$[source].lastFailedRuntime":
            failedAt.valueOf() - attemptedAt.valueOf(),
          "dataSources.$[source].lastError": String(e),
          "dataSources.$[source].lastResult": "failure",
        },
      },
      { arrayFilters: [{ "source.id": dataSource.id }] },
    );
    throw e;
  }
}
