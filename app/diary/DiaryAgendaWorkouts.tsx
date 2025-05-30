import { tz, TZDate } from "@date-fns/tz";
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
import Popover from "../../components/Popover";
import UserStuffSourcesForm from "../../components/UserStuffSourcesForm";
import type { PRType } from "../../lib";
import { isNextSetDue, type WorkoutData } from "../../models/workout";
import {
  MaterializedWorkoutsView,
  type getNextSets,
  type IWorkoutLocationsView,
} from "../../models/workout.server";
import { dataSourceGroups } from "../../sources/utils";
import { dateToString, DEFAULT_TIMEZONE, isNonEmptyArray } from "../../utils";
import DiaryAgendaWorkoutsSettings from "./DiaryAgendaWorkoutsSettings";
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
        <div className="flex items-center gap-2">
          <DiaryAgendaWorkoutsSettings />
          <Popover control="📡">
            <div className="absolute top-4 left-4 z-30 max-h-[66vh] w-96 max-w-[80vw] overflow-auto overscroll-contain rounded-lg bg-[yellow] p-2 shadow-[yellow_0_0_20px]">
              <UserStuffSourcesForm
                user={user}
                sourceOptions={dataSourceGroups.workouts}
              />
            </div>
          </Popover>
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
              workout={workout}
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
          {isNonEmptyArray(dueSets) ? (
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
        "Bison Boulders",
        "Boulders Hvidovre",
        "Boulders Sydhavn",
        "Boulders Valby",
        "Boulders Amager",
        "Beta Boulders West",
        "Beta Boulders South",
        "Beta Boulders Østerbro",
      ].map(async (location) => {
        const boulderingInThePast = await MaterializedWorkoutsView.findOne(
          {
            userId: user.id,
            "exercises.exerciseId": 2001,
            location,
            workedOutAt: { $gte: subMonths(tzDate, 1), $lte: tzDate },
            deletedAt: { $exists: false },
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
        {leastRecentBoulderingLocations.slice(0, 4).map((location) => (
          <li key={location.location} className="leading-none">
            <div className="flex items-center gap-1">
              <span className="font-semibold">{location.location}</span> -{" "}
              {location.mostRecentVisit ? (
                <Link
                  prefetch={false}
                  href={`/diary/${dateToString(location.mostRecentVisit)}`}
                  className="text-xs"
                  style={{ color: "#edab00" }}
                >
                  {location.mostRecentVisit
                    ? formatDistanceStrict(
                        startOfDay(location.mostRecentVisit, {
                          in: tz(tzDate.timeZone || DEFAULT_TIMEZONE),
                        }),
                        startOfDay(tzDate),
                        { addSuffix: true, roundingMethod: "ceil" },
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
