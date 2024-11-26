import { TZDate } from "@date-fns/tz";
import {
  compareAsc,
  formatDistanceStrict,
  startOfDay,
  subMonths,
} from "date-fns";
import type { WithId } from "mongodb";
import type { Session } from "next-auth";
import Link from "next/link";
import { Suspense } from "react";
import { FieldSetY } from "../../components/FieldSet";
import type { PRType } from "../../lib";
import { isNextSetDue, type WorkoutData } from "../../models/workout";
import {
  MaterializedWorkoutsView,
  type getNextSets,
  type IWorkoutLocationsView,
} from "../../models/workout.server";
import { dateToString, DEFAULT_TIMEZONE } from "../../utils";
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
  const dueSets = nextSets?.filter((nextSet) => isNextSetDue(tzDate, nextSet));

  return (
    <FieldSetY
      className="grid flex-1 gap-x-2 gap-y-1"
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
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(256px, 1fr))" }}
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
          <Suspense>
            <LeastRecentGym user={user} date={date} />
          </Suspense>
        </div>
      )}
    </FieldSetY>
  );
}

const nearestLiftingLocationToBoulderingLocation: Record<
  string,
  string | null
> = {
  "Boulders Hvidovre": "PureGym Friheden Butikscenter",
  "Boulders Sydhavn": "PureGym Sjælør",
  "Boulders Valby": "PureGym Mosedalvej",
  "Boulders Amager": null,
  "Beta Boulders West": "PureGym C.F. Richs Vej",
  "Beta Boulders South": "PureGym Sjælør",
  "Beta Boulders Osterbro": "PureGym Æbeløgade",
};

async function LeastRecentGym({
  user,
  date,
}: {
  user: Session["user"];
  date: string;
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const tzDate = new TZDate(date, timeZone);
  const leastRecentBoulderingLocations = (
    await Promise.all(
      [
        "Boulders Hvidovre",
        "Boulders Sydhavn",
        "Boulders Valby",
        "Boulders Amager",
        "Beta Boulders West",
        "Beta Boulders South",
        "Beta Boulders Osterbro",
      ].map(async (location) => {
        const boulderingInThePast = await MaterializedWorkoutsView.findOne(
          {
            userId: user.id,
            "exercises.exerciseId": 2001,
            location,
            workedOutAt: { $gte: subMonths(tzDate, 1), $lte: tzDate },
          },
          { sort: { workedOutAt: -1 } },
        );

        return {
          userId: user.id,
          location,
          mostRecentVisit: boulderingInThePast?.workedOutAt || null,
        } satisfies IWorkoutLocationsView;
      }),
    )
  ).sort((a, b) => compareAsc(a.mostRecentVisit || 0, b.mostRecentVisit || 0));

  return (
    <div>
      <h2 className="text-lg font-semibold">Least recent boulder gyms:</h2>
      <ul className="flex flex-col gap-1">
        {leastRecentBoulderingLocations.slice(0, 3).map((location) => (
          <li key={location.location} className="leading-none">
            <div className="flex items-center gap-1">
              <span className="font-semibold">{location.location}</span> -{" "}
              {location.mostRecentVisit ? (
                <Link
                  href={`/diary/${dateToString(location.mostRecentVisit)}`}
                  className="text-xs"
                  style={{ color: "#edab00" }}
                >
                  {location.mostRecentVisit
                    ? formatDistanceStrict(
                        startOfDay(location.mostRecentVisit),
                        startOfDay(tzDate),
                        { addSuffix: true, roundingMethod: "floor" },
                      )
                    : "never"}
                </Link>
              ) : (
                <span className="text-xs">not visited in the past month</span>
              )}
            </div>
            {nearestLiftingLocationToBoulderingLocation[location.location] ? (
              <div>
                <span className="text-xs">Closest lifting gym: </span>
                <span className="text-sm">
                  {
                    nearestLiftingLocationToBoulderingLocation[
                      location.location
                    ]
                  }
                </span>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
