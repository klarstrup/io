"use client";
import { TZDate } from "@date-fns/tz";
import { compareAsc, differenceInDays, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import { useState } from "react";
import { FieldSetY } from "../../components/FieldSet";
import type { DiaryEntry } from "../../lib";
import type { getNextSets } from "../../models/workout.server";
import { DEFAULT_TIMEZONE } from "../../utils";
import { NextSets } from "./NextSets";
import WorkoutEntry from "./WorkoutEntry";
import { WorkoutForm } from "./WorkoutForm";

export function DiaryAgendaWorkouts({
  date,
  workouts,
  user,
  locations,
  nextSets,
}: {
  date: `${number}-${number}-${number}`;
  workouts: DiaryEntry["workouts"];
  user: Session["user"];
  locations: string[];
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const [isAddingWorkout, setIsAddingWorkout] = useState(false);

  const now = TZDate.tz(timeZone);
  const dueSets = nextSets?.filter(
    (nextSet) => differenceInDays(startOfDay(now), nextSet.workedOutAt) > 3,
  );

  return (
    <FieldSetY className="flex-1">
      <legend className="ml-2">
        <big>Workouts</big>
      </legend>
      {isAddingWorkout ? null : workouts?.length ? (
        Array.from(workouts)
          .sort((a, b) => compareAsc(a.workedOutAt, b.workedOutAt))
          ?.map((workout) => (
            <WorkoutEntry
              key={workout._id}
              user={user}
              workout={workout}
              locations={locations}
              nextSets={nextSets}
            />
          ))
      ) : (
        <div className="flex h-full flex-wrap items-center justify-around">
          <div className="flex flex-col items-center justify-center">
            <p className="mb-2">No workout logged </p>
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
              <NextSets nextSets={dueSets} />
            </div>
          ) : null}
        </div>
      )}
      {isAddingWorkout ? (
        <fieldset className="w-full">
          <legend>New workout</legend>
          <WorkoutForm
            date={date}
            user={user}
            locations={locations}
            nextSets={nextSets}
            onClose={() => setIsAddingWorkout(false)}
          />
        </fieldset>
      ) : null}
    </FieldSetY>
  );
}
