import { auth } from "../../../auth";
import { Crimpd, CrimpdWorkoutLogs } from "../../../sources/crimpd";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { materializeAllCrimpdWorkouts } from "../materialize_workouts/materializers";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.Crimpd) continue;

      yield* wrapSource(dataSource, user, async function* ({ token }) {
        const workoutLogs = (
          (await (
            await fetch("https://api.crimpd.com/workout_log", {
              headers: { Authorization: `Bearer ${token}` },
            })
          ).json()) as Crimpd.WorkoutLogResponse
        ).workout_logs;

        for (const workoutLog of workoutLogs) {
          await CrimpdWorkoutLogs.updateOne(
            { _id: workoutLog._id },
            {
              $set: {
                ...workoutLog,
                logDate: new Date(workoutLog.logDate),
                dateCreated: new Date(workoutLog.dateCreated),
                lastUpdated: new Date(workoutLog.lastUpdated),
                _io_userId: user.id,
              },
            },
            { upsert: true },
          );
        }

        yield { workoutLogs };
      });
    }

    yield* materializeAllCrimpdWorkouts({ user });
  });
