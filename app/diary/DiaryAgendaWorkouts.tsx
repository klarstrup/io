import { tz, TZDate } from "@date-fns/tz";
import { compareAsc, formatDistance, startOfDay, subMonths } from "date-fns";
import { type WithId } from "mongodb";
import type { Session } from "next-auth";
import Link from "next/link";
import { Suspense } from "react";
import { FieldSetY } from "../../components/FieldSet";
import type { PRType } from "../../lib";
import { Locations } from "../../models/location.server";
import type { WorkoutData } from "../../models/workout";
import {
  MaterializedWorkoutsView,
  type IWorkoutLocationsView,
} from "../../models/workout.server";
import { dateToString, DEFAULT_TIMEZONE, isNonEmptyArray } from "../../utils";
import WorkoutEntry from "./WorkoutEntry";

export function DiaryAgendaWorkouts({
  date,
  workouts,
  workoutsExerciseSetPRs,
  user,
}: {
  date: `${number}-${number}-${number}`;
  workouts?: WithId<WorkoutData>[];
  workoutsExerciseSetPRs?: Record<PRType, boolean>[][][];
  user?: Session["user"];
}) {
  return (
    <FieldSetY
      className="grid flex-1 gap-x-2 gap-y-1"
      legend={
        <div className="flex items-center gap-2">
          Workouts
          {isNonEmptyArray(workouts) ? (
            <Link
              prefetch={false}
              href={`/diary/${date}/workout`}
              className="cursor-pointer rounded-full bg-[#ff0] px-1 py-0.5 text-center text-xs font-semibold"
            >
              ➕
            </Link>
          ) : null}
        </div>
      }
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(256px, 1fr))" }}
    >
      {isNonEmptyArray(workouts) ? (
        Array.from(workouts)
          .sort((a, b) => compareAsc(a.workedOutAt, b.workedOutAt))
          ?.map((workout) => (
            <WorkoutEntry
              exerciseSetPRs={
                workoutsExerciseSetPRs?.[workouts.indexOf(workout)]
              }
              key={workout._id.toString()}
              workout={{
                ...workout,
                __typename: "Workout",
                location: undefined,
                exercises: workout.exercises.map((e) => ({
                  ...e,
                  __typename: "WorkoutExercise",
                  sets: e.sets.map((s) => ({
                    ...s,
                    __typename: "WorkoutSet",
                    meta: s.meta as
                      | {
                          __typename: "WorkoutSetMeta";
                          key: string;
                          value: string;
                        }[]
                      | undefined,
                    inputs: s.inputs.map((i) => ({
                      ...i,
                      __typename: "WorkoutSetInput",
                    })),
                  })),
                })),
              }}
            />
          ))
      ) : (
        <div className="flex h-full flex-wrap items-center justify-around gap-4">
          <div className="flex flex-col items-center justify-center">
            <p className="mb-2 whitespace-nowrap">No workout logged</p>
            <div>
              <Link
                prefetch={false}
                href={`/diary/${date}/workout`}
                className="mb-4 cursor-pointer rounded-2xl bg-[#ff0] px-3 py-2 pr-4 text-center text-xl font-semibold"
              >
                ➕ Workout
              </Link>
            </div>
          </div>
          {user ? (
            <Suspense>
              <LeastRecentGym user={user} date={date} />
            </Suspense>
          ) : null}
        </div>
      )}
    </FieldSetY>
  );
}

async function LeastRecentGym({
  user,
  date,
}: {
  user: Session["user"];
  date: string;
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const tzDate = new TZDate(date, timeZone);
  const favoriteLocations = await Locations.find({
    userId: user.id,
    isFavorite: true,
  }).toArray();
  const leastRecentLocations = (
    await Promise.all(
      favoriteLocations.map(async (location) => {
        const workoutInThePast = await MaterializedWorkoutsView.findOne(
          {
            userId: user.id,
            workedOutAt: { $gte: subMonths(tzDate, 1), $lte: tzDate },
            deletedAt: { $exists: false },
            $or: [
              { locationId: location._id.toString() },
              { location: location.name },
            ],
          },
          { sort: { workedOutAt: -1 } },
        );

        return {
          location,
          mostRecentVisit: workoutInThePast?.workedOutAt || null,
        } satisfies IWorkoutLocationsView;
      }),
    )
  ).sort((a, b) => compareAsc(a.mostRecentVisit || 0, b.mostRecentVisit || 0));

  if (!isNonEmptyArray(leastRecentLocations)) {
    return null;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Least recent gyms:</h2>
      <ul className="flex flex-col gap-1">
        {leastRecentLocations.slice(0, 4).map((location) => (
          <li key={location.location._id.toString()} className="leading-none">
            <div className="flex items-center gap-1">
              <span className="font-semibold">{location.location.name}</span> -{" "}
              {location.mostRecentVisit ? (
                <Link
                  prefetch={false}
                  href={`/diary/${dateToString(location.mostRecentVisit)}`}
                  className="text-xs"
                  style={{ color: "#edab00" }}
                >
                  {location.mostRecentVisit
                    ? formatDistance(
                        startOfDay(location.mostRecentVisit, {
                          in: tz(tzDate.timeZone || DEFAULT_TIMEZONE),
                        }),
                        startOfDay(tzDate),
                        { addSuffix: true },
                      )
                    : "never"}
                </Link>
              ) : (
                <span className="text-xs">not visited in the past month</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
