"use client";
import { useSortable } from "@dnd-kit/sortable";
import { faDumbbell } from "@fortawesome/free-solid-svg-icons";
import { addDays, subHours } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ComponentProps, forwardRef, useRef, useState } from "react";
import { Workout } from "../../graphql.generated";
import { useClickOutside } from "../../hooks";
import { exercisesById } from "../../models/exercises";
import { LocationData } from "../../models/location";
import type { getNextSets } from "../../models/workout.server";
import { dateToString, dayStartHour } from "../../utils";
import { snoozeUserExerciseSchedule } from "./actions";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { getJournalEntryPrincipalDate } from "./diaryUtils";
import { WorkoutEntryExerciseSetRow } from "./WorkoutEntryExerciseSetRow";

export function DiaryAgendaDayDueSet({
  sortableId,
  ...props
}: {
  sortableId: string;
} & Omit<
  ComponentProps<typeof DiaryAgendaDayDueSetButItsNotDraggable>,
  "isDragging"
>) {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: sortableId,
    data: {
      nextSet: props.dueSet,
      date: getJournalEntryPrincipalDate(props.dueSet),
    },
  });

  return (
    <DiaryAgendaDayDueSetButItsNotDraggable
      ref={setNodeRef}
      style={{
        transition,
        ...(transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: 100,
            }
          : undefined),
      }}
      isDragging={isDragging}
      {...listeners}
      {...attributes}
      {...props}
    />
  );
}

export const DiaryAgendaDayDueSetButItsNotDraggable = forwardRef(
  function DiaryAgendaDayDueSetButItsNotDraggable(
    {
      userId,
      dueSet,
      date,
      workouts,
      locations,
      isDragging,
      ...props
    }: {
      userId: string;
      dueSet: Awaited<ReturnType<typeof getNextSets>>[number];
      date: Date;
      workouts?: Workout[];
      locations?: (LocationData & { id: string })[];
      isDragging: boolean;
    } & React.HTMLAttributes<HTMLDivElement>,
    ref2: React.Ref<HTMLDivElement>,
  ) {
    const [isActive, setIsActive] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const onClickOutside = () => setIsActive(false);
    useClickOutside(ref, onClickOutside);
    const exercise = exercisesById[dueSet.exerciseId]!;
    const router = useRouter();

    return (
      <DiaryAgendaDayEntry
        ref={ref2}
        {...props}
        icon={faDumbbell}
        onIconClick={(e) => {
          e.preventDefault();

          // Hidden exercises cannot be manually logged
          if (exercise.is_hidden) return;

          const dateStr = dateToString(subHours(new Date(), dayStartHour));
          const searchStr = `scheduleEntryId=${dueSet.scheduleEntry.id}`;
          router.push(`/diary/${dateStr}/workout?${searchStr}`);
        }}
      >
        <div
          ref={ref}
          style={
            isDragging ? { boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)" } : {}
          }
          className={
            "relative flex items-stretch justify-center rounded-md border border-black/20 bg-white transition-shadow " +
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
            <Link prefetch={false} href={`/diary/exercises/${exercise.id}`}>
              {[exercise.name, ...exercise.aliases]
                .filter((name) => name.length >= 4)
                .sort((a, b) => a.length - b.length)[0]!
                .replace("Barbell", "")}
            </Link>
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
      </DiaryAgendaDayEntry>
    );
  },
);
