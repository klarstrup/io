import { ObjectId } from "mongodb";
import { auth } from "../../../auth";
import { Users } from "../../../models/user.server";
import { getRuns } from "../../../sources/rundouble";
import { RunDoubleRuns } from "../../../sources/rundouble.server";
import { DataSource } from "../../../sources/utils";
import { materializeAllRunDoubleWorkouts } from "../materialize_workouts/materializers";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.RunDouble) continue;

      await Users.updateOne(
        { _id: new ObjectId(user.id) },
        { $set: { "dataSources.$[source].lastAttemptedAt": new Date() } },
        { arrayFilters: [{ "source.id": dataSource.id }] },
      );
      const runtime = Date.now();

      const runDoubleId = dataSource.config.id;

      for await (const run of getRuns(runDoubleId, { maxAge: 0 })) {
        const updateResult = await RunDoubleRuns.updateOne(
          { key: run.key },
          {
            $set: {
              ...run,
              userId: runDoubleId,
              completedAt: new Date(run.completedLong),
              _io_scrapedAt: new Date(),
            },
          },
          { upsert: true },
        );

        yield run.completed;

        if (!updateResult.upsertedCount) break;
      }

      await Users.updateOne(
        { _id: new ObjectId(user.id) },
        {
          $set: {
            "dataSources.$[source].lastSuccessfulAt": new Date(),
            "dataSources.$[source].lastSuccessfulRuntime": Date.now() - runtime,
            "dataSources.$[source].lastResult": "success",
          },
        },
        { arrayFilters: [{ "source.id": dataSource.id }] },
      );

      yield* materializeAllRunDoubleWorkouts({ user });
    }
  });
