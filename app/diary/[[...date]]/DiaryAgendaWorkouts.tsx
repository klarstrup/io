"use client";
import { TZDate } from "@date-fns/tz";
import { compareAsc, differenceInDays, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import { useState } from "react";
import { FieldSetX, FieldSetY } from "../../../components/FieldSet";
import type { DiaryEntry } from "../../../lib";
import type { getNextSets } from "../../../models/workout.server";
import { DEFAULT_TIMEZONE } from "../../../utils";
import { NextSets } from "./NextSets";
import WorkoutEntry from "./WorkoutEntry";
import { WorkoutForm } from "./WorkoutForm";

export function DiaryAgendaWorkouts({
  date,
  workouts,
  workoutsExerciseSetPRs,
  user,
  locations,
  nextSets,
}: {
  date: `${number}-${number}-${number}`;
  workouts: DiaryEntry["workouts"];
  workoutsExerciseSetPRs?: Record<
    string,
    {
      isAllTimePR: boolean;
      isYearPR: boolean;
      is3MonthPR: boolean;
    }[][]
  >;
  user: Session["user"];
  locations: string[];
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const [isAddingWorkout, setIsAddingWorkout] = useState(false);

  const tzDate = new TZDate(date, timeZone);
  const dueSets = nextSets?.filter(
    (nextSet) => differenceInDays(startOfDay(tzDate), nextSet.workedOutAt) > 3,
  );

  return (
    <FieldSetY
      className="flex-1"
      legend={
        <div className="flex items-center">
          Workouts
          {workouts?.length ? (
            <button
              onClick={() => setIsAddingWorkout(true)}
              className="mx-2 cursor-pointer rounded-full bg-[#ff0] px-1 py-0.5 text-center text-xs font-semibold"
            >
              ➕
            </button>
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
          ?.map((workout) => (
            <WorkoutEntry
              exerciseSetPRs={workoutsExerciseSetPRs?.[workout._id]}
              key={workout._id}
              date={date}
              user={user}
              workout={workout}
              locations={locations}
              nextSets={nextSets}
            />
          ))
      ) : isAddingWorkout && !workouts?.length ? (
        <FieldSetX className="w-full" legend="New workout">
          <WorkoutForm
            date={date}
            user={user}
            locations={locations}
            nextSets={nextSets}
            onClose={() => setIsAddingWorkout(false)}
          />
        </FieldSetX>
      ) : (
        <div className="flex h-full flex-wrap items-center justify-around">
          <div className="flex flex-col items-center justify-center">
            <p className="mb-2 whitespace-nowrap">No workout logged</p>
            <div>
              <button
                onClick={() => setIsAddingWorkout(true)}
                className="mb-4 cursor-pointer rounded-2xl bg-[#ff0] px-3 py-2 pr-4 text-center text-xl font-semibold"
              >
                ➕ Workout
              </button>
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
      {isAddingWorkout && workouts?.length ? (
        <FieldSetX className="w-full" legend="New workout">
          <WorkoutForm
            date={date}
            user={user}
            locations={locations}
            nextSets={nextSets}
            onClose={() => setIsAddingWorkout(false)}
          />
        </FieldSetX>
      ) : null}
    </FieldSetY>
  );
}
