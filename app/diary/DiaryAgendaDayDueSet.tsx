"use client";
import { addDays } from "date-fns";
import { useRef, useState } from "react";
import { useClickOutside } from "../../hooks";
import { exercisesById } from "../../models/exercises";
import type { getNextSets } from "../../models/workout.server";
import { snoozeUserExerciseSchedule } from "./actions";
import { WorkoutEntryExerciseSetRow } from "./WorkoutEntryExerciseSetRow";

export function DiaryAgendaDayDueSet({
  userId,
  dueSet,
  date,
}: {
  userId: string;
  dueSet: Awaited<ReturnType<typeof getNextSets>>[number];
  date: Date;
}) {
  const [isActive, setIsActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const onClickOutside = () => setIsActive(false);
  useClickOutside(ref, onClickOutside);
  const exercise = exercisesById[dueSet.exerciseId]!;

  return (
    <div
      ref={ref}
      className={
        "group relative inline-flex flex-col items-stretch justify-center rounded-md border border-black/10 bg-white " +
        (isActive ? "rounded-b-none" : "cursor-pointer")
      }
      onClick={() => setIsActive(true)}
    >
      <div className="h-full self-stretch text-center px-1.5 py-0.5">
        {
          [exercise.name, ...exercise.aliases]
            .filter((name) => name.length >= 4)
            .sort((a, b) => a.length - b.length)[0]!
        }
      </div>
      <div className="flex items-center justify-center self-stretch rounded-b-md bg-black/60 px-1.5 text-xs text-white opacity-40">
        {dueSet.nextWorkingSetInputs?.length || dueSet.nextWorkingSets ? (
          <table className="w-auto max-w-0">
            <tbody>
              <WorkoutEntryExerciseSetRow
                exercise={exercise}
                set={{
                  inputs: dueSet.nextWorkingSetInputs ?? [],
                }}
                repeatCount={dueSet.nextWorkingSets}
              />
            </tbody>
          </table>
        ) : (
          "Exercise"
        )}
      </div>
      {isActive && (
        <div className="absolute top-full right-0 left-0 z-10 flex flex-wrap items-center justify-center gap-1 rounded-b-md border border-t-0 border-black/10 bg-white p-1">
          <button
            type="button"
            onClick={() =>
              void snoozeUserExerciseSchedule(
                userId,
                dueSet.exerciseId,
                addDays(date, 1),
              )
            }
            className={
              "text-md cursor-pointer rounded-xl bg-yellow-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
            }
          >
            Snooze
          </button>
        </div>
      )}
    </div>
  );
}
