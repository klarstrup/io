import { auth } from "../../../auth";
import { Grippy, GrippyWorkoutLogs } from "../../../sources/grippy";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { materializeAllGrippyWorkouts } from "../materialize_workouts/materializers";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.Grippy) continue;

      yield* wrapSource(dataSource, user, async function* ({ authTokens }) {
        const response = await fetch(
          "https://api.griptonite.io/workouts/logs",
          { headers: { Authorization: `Bearer ${authTokens.access_token}` } },
        );

        if (!response.ok || response.status !== 200) {
          throw await response.text();
        }

        const json = (await response.json()) as Grippy.WorkoutLogsResponse;

        const workoutLogs = json.data;

        for (const workoutLog of workoutLogs) {
          await GrippyWorkoutLogs.updateOne(
            { uuid: workoutLog.uuid },
            {
              $set: {
                ...workoutLog,
                start_time: new Date(workoutLog.start_time),
                end_time: new Date(workoutLog.end_time),
                _io_userId: user.id,
              },
            },
            { upsert: true },
          );
        }

        yield { workoutLogs };
      });
    }

    yield* materializeAllGrippyWorkouts({ user });
  });
