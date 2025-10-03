import { auth } from "../../../auth";
import { Crimpd, CrimpdWorkoutLogs } from "../../../sources/crimpd";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { fetchJson, jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.Crimpd,
      async function* ({ config: { token } }, setUpdated) {
        setUpdated(false);

        const { workout_logs: workoutLogs } =
          await fetchJson<Crimpd.WorkoutLogResponse>(
            "https://api.crimpd.com/workout_log",
            { headers: { Authorization: `Bearer ${token}` } },
          );

        for (const workoutLog of workoutLogs) {
          const updateResult = await CrimpdWorkoutLogs.updateOne(
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

          setUpdated(updateResult);
        }

        yield { workoutLogs };
      },
    );
  });
