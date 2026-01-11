"use client";
import { addDays, subHours } from "date-fns";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useClickOutside } from "../../hooks";
import { exercisesById } from "../../models/exercises";
import { LocationData } from "../../models/location";
import { WorkoutData } from "../../models/workout";
import type { getNextSets } from "../../models/workout.server";
import { dateToString, dayStartHour } from "../../utils";
import { snoozeUserExerciseSchedule } from "./actions";
import { NextSetDraggable } from "./TodoDroppable";
import { WorkoutEntryExerciseSetRow } from "./WorkoutEntryExerciseSetRow";

export function DiaryAgendaDayDueSet({
  userId,
  dueSet,
  date,
  workouts,
  locations,
}: {
  userId: string;
  dueSet: Awaited<ReturnType<typeof getNextSets>>[number];
  date: Date;
  workouts?: (WorkoutData & { materializedAt?: Date })[];
  locations?: (LocationData & { id: string })[];
}) {
  const [isActive, setIsActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const onClickOutside = () => setIsActive(false);
  useClickOutside(ref, onClickOutside);
  const exercise = exercisesById[dueSet.exerciseId]!;
  const router = useRouter();

  return (
    <NextSetDraggable nextSet={dueSet} ref={ref}>
      <div
        className={
          "group relative flex items-stretch justify-center rounded-md border border-black/20 bg-white " +
          (isActive ? "rounded-b-none" : "cursor-pointer")
        }
        onClick={() => setIsActive(true)}
      >
        <div
          className={
            "h-full w-32 self-stretch bg-black/20 px-1.5 py-0.5 text-left text-xs text-white " +
            (isActive
              ? "rounded-l-[5px] rounded-b-none "
              : "rounded-l-[5px] ") +
            (dueSet.nextWorkingSetInputs?.length || dueSet.nextWorkingSets
              ? ""
              : " rounded-r-[5px]")
          }
        >
          {[exercise.name, ...exercise.aliases]
            .filter((name) => name.length >= 4)
            .sort((a, b) => a.length - b.length)[0]!
            .replace("Barbell", "")}
        </div>
        {dueSet.nextWorkingSetInputs?.length || dueSet.nextWorkingSets ? (
          <div
            className={
              "flex items-center justify-center self-stretch px-1.5 text-xs " +
              (isActive ? "rounded-b-none" : "rounded-b-[5px]")
            }
          >
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
          </div>
        ) : null}
        {isActive && (
          <div className="absolute top-full right-0 left-0 z-10 -mx-px flex flex-wrap items-center justify-center gap-1 rounded-b-[5px] border border-t-0 border-black/20 bg-white p-1">
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
            {exercise.is_hidden ? null : (
              <button
                type="button"
                onClick={(e) => {
                  console.log({ e });
                  e.preventDefault();
                  const select = e.currentTarget.querySelector(
                    "select",
                  ) as HTMLSelectElement;
                  const selectedExistingWorkout = select.value || null;

                  const dateStr = dateToString(
                    subHours(new Date(), dayStartHour),
                  );
                  const searchStr = `scheduleEntryId=${dueSet.scheduleEntry.id}`;
                  router.push(
                    selectedExistingWorkout
                      ? `/diary/${dateStr}/workout/${selectedExistingWorkout}?${searchStr}`
                      : `/diary/${dateStr}/workout?${searchStr}`,
                  );
                }}
                className={
                  "text-md cursor-pointer rounded-xl bg-green-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                }
              >
                Do now{" "}
                <select
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  className="ml-1 rounded-md border border-black/5 bg-white px-1 py-0.5 text-black"
                >
                  <option value="">in new workout</option>
                  {workouts?.map((workout) => {
                    const location = locations?.find(
                      (loc) => loc.id === workout.locationId,
                    );

                    return (
                      <option value={workout.id} key={workout.id}>
                        at {location ? location.name : "Unknown location"}
                      </option>
                    );
                  })}
                </select>
              </button>
            )}
          </div>
        )}
      </div>
    </NextSetDraggable>
  );
}
