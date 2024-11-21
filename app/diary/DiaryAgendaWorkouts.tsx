import { TZDate } from "@date-fns/tz";
import { compareAsc, differenceInDays, startOfDay } from "date-fns";
import type { WithId } from "mongodb";
import type { Session } from "next-auth";
import Link from "next/link";
import { FieldSetY } from "../../components/FieldSet";
import type { PRType } from "../../lib";
import type { WorkoutData } from "../../models/workout";
import type { getNextSets } from "../../models/workout.server";
import { DEFAULT_TIMEZONE } from "../../utils";
import { NextSets } from "./NextSets";
import WorkoutEntry from "./WorkoutEntry";

export function DiaryAgendaWorkouts({
  date,
  workouts,
  workoutsExerciseSetPRs,
  user,
  nextSets,
}: {
  date: `${number}-${number}-${number}`;
  workouts: WithId<WorkoutData>[];
  workoutsExerciseSetPRs?: Record<PRType, boolean>[][][];
  user: Session["user"];
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const tzDate = new TZDate(date, timeZone);
  const dueSets = nextSets?.filter(
    (nextSet) =>
      differenceInDays(startOfDay(tzDate), nextSet.workedOutAt || new Date(0)) >
      3,
  );

  return (
    <FieldSetY
      className="min-w-[50%] flex-1"
      legend={
        <div className="flex items-center">
          Workouts
          {workouts?.length ? (
            <Link
              href={`/diary/${date}/workout`}
              className="mx-2 cursor-pointer rounded-full bg-[#ff0] px-1 py-0.5 text-center text-xs font-semibold"
            >
              ➕
            </Link>
          ) : null}
        </div>
      }
      style={{
        display: "grid",
        gap: "8px 4px",
        gridTemplateColumns: "repeat(auto-fit, minmax(256px, 1fr))",
      }}
    >
      {workouts?.length ? (
        Array.from(workouts)
          .sort((a, b) => compareAsc(a.workedOutAt, b.workedOutAt))
          ?.map((workout) => {
            const _id = workout._id.toString();
            return (
              <WorkoutEntry
                exerciseSetPRs={
                  workoutsExerciseSetPRs?.[workouts.indexOf(workout)]
                }
                key={_id}
                workout={{ ...workout, _id }}
              />
            );
          })
      ) : (
        <div className="flex h-full flex-wrap items-center justify-around">
          <div className="flex flex-col items-center justify-center">
            <p className="mb-2 whitespace-nowrap">No workout logged</p>
            <div>
              <Link
                href={`/diary/${date}/workout`}
                className="mb-4 cursor-pointer rounded-2xl bg-[#ff0] px-3 py-2 pr-4 text-center text-xl font-semibold"
              >
                ➕ Workout
              </Link>
            </div>
          </div>
          {dueSets?.length ? (
            <div>
              <b>Due Sets:</b>
              <NextSets user={user} date={date} nextSets={dueSets} />
            </div>
          ) : null}
        </div>
      )}
    </FieldSetY>
  );
}
