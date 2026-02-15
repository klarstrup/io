"use client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { tz } from "@date-fns/tz";
import { useSortable } from "@dnd-kit/sortable";
import { faDumbbell } from "@fortawesome/free-solid-svg-icons";
import {
  addDays,
  addHours,
  addMilliseconds,
  isEqual,
  isFuture,
  startOfDay,
  subHours,
} from "date-fns";
import { gql } from "graphql-tag";
import type { Session } from "next-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ComponentProps, forwardRef, useRef, useState } from "react";
import UserStuffSourcesForm from "../../components/UserStuffSourcesForm";
import {
  ExerciseInfo,
  Location,
  NextSet,
  SnoozeExerciseScheduleMutation,
  type SnoozeExerciseScheduleMutationVariables,
  UnsnoozeExerciseScheduleMutation,
  type UnsnoozeExerciseScheduleMutationVariables,
  Workout,
} from "../../graphql.generated";
import { useClickOutside } from "../../hooks";
import { durationToMs } from "../../models/workout";
import { exerciseIdToDataSourceMapping } from "../../sources/utils";
import {
  type cotemporality,
  dateToString,
  dayStartHour,
  epoch,
} from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { getJournalEntryPrincipalDate } from "./diaryUtils";
import { WorkoutEntryExerciseSetRow } from "./WorkoutEntryExerciseSetRow";

export function DiaryAgendaDayDueSet({
  ...props
}: {} & Omit<
  ComponentProps<typeof DiaryAgendaDayDueSetButItsNotDraggable>,
  "isDragging"
>) {
  const client = useApolloClient();
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id:
      client.cache.identify(props.dueSet.scheduleEntry) ||
      props.dueSet.scheduleEntry.id,
    data: {
      nextSet: props.dueSet,
      date:
        getJournalEntryPrincipalDate(props.dueSet)?.start || props.dueSet.dueOn,
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
      user,
      dueSet,
      exerciseInfo,
      date,
      workouts,
      locations,
      isDragging,
      cotemporalityOfSurroundingEvent,
      ...props
    }: {
      user: Session["user"];
      dueSet: NextSet;
      exerciseInfo: ExerciseInfo;
      date: Date;
      workouts?: Workout[];
      locations?: Location[];
      isDragging: boolean;
      cotemporalityOfSurroundingEvent?: ReturnType<typeof cotemporality> | null;
    } & React.HTMLAttributes<HTMLDivElement>,
    ref2: React.Ref<HTMLDivElement>,
  ) {
    const [isActive, setIsActive] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const onClickOutside = () => setIsActive(false);
    useClickOutside(ref, onClickOutside);
    const router = useRouter();

    const [snoozeExerciseSchedule] = useMutation<
      SnoozeExerciseScheduleMutation,
      SnoozeExerciseScheduleMutationVariables
    >(gql`
      mutation SnoozeExerciseSchedule($input: SnoozeExerciseScheduleInput!) {
        snoozeExerciseSchedule(input: $input) {
          exerciseSchedule {
            id
            exerciseId
            enabled
            frequency {
              years
              months
              weeks
              days
              hours
              minutes
              seconds
            }
            increment
            workingSets
            workingReps
            deloadFactor
            baseWeight
            snoozedUntil
            order
            nextSet {
              workedOutAt
              dueOn
              exerciseId
              successful
              nextWorkingSets
              nextWorkingSetInputs {
                unit
                value
                assistType
              }
              scheduleEntry {
                id
                exerciseId
                enabled
                frequency {
                  years
                  months
                  weeks
                  days
                  hours
                  minutes
                  seconds
                }
                increment
                workingSets
                workingReps
                deloadFactor
                baseWeight
                snoozedUntil
                order
              }
            }
          }
        }
      }
    `);

    const [unsnoozeExerciseSchedule] = useMutation<
      UnsnoozeExerciseScheduleMutation,
      UnsnoozeExerciseScheduleMutationVariables
    >(gql`
      mutation UnsnoozeExerciseSchedule(
        $input: UnsnoozeExerciseScheduleInput!
      ) {
        unsnoozeExerciseSchedule(input: $input) {
          exerciseSchedule {
            id
            exerciseId
            enabled
            frequency {
              years
              months
              weeks
              days
              hours
              minutes
              seconds
            }
            increment
            workingSets
            workingReps
            deloadFactor
            baseWeight
            snoozedUntil
            order
            nextSet {
              workedOutAt
              dueOn
              exerciseId
              successful
              nextWorkingSets
              nextWorkingSetInputs {
                unit
                value
                assistType
              }
              scheduleEntry {
                id
                exerciseId
                enabled
                frequency {
                  years
                  months
                  weeks
                  days
                  hours
                  minutes
                  seconds
                }
                increment
                workingSets
                workingReps
                deloadFactor
                baseWeight
                snoozedUntil
                order
              }
            }
          }
        }
      }
    `);
    return (
      <DiaryAgendaDayEntry
        ref={ref2}
        cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEvent}
        {...props}
        icon={faDumbbell}
        onIconClick={
          // Hidden exercises cannot be manually logged
          exerciseInfo.isHidden
            ? undefined
            : (e) => {
                e.preventDefault();

                const dateStr = dateToString(
                  subHours(new Date(), dayStartHour),
                );
                const searchStr = `scheduleEntryId=${dueSet.scheduleEntry.id}`;
                router.push(`/diary/${dateStr}/workout?${searchStr}`);
              }
        }
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
              "h-full w-32 self-stretch bg-black/20 px-1.5 py-0.5 text-left text-sm text-white " +
              (isActive
                ? "rounded-l-[5px] rounded-b-none "
                : "rounded-l-[5px] ") +
              (dueSet.nextWorkingSetInputs?.length || dueSet.nextWorkingSets
                ? ""
                : " rounded-r-[5px]")
            }
          >
            {!isActive ? (
              [exerciseInfo.name, ...exerciseInfo.aliases]
                .filter((name) => name.length >= 4)
                .sort((a, b) => a.length - b.length)[0]!
                .replace("Barbell", "")
            ) : (
              <Link
                prefetch={false}
                href={`/diary/exercises/${exerciseInfo.id}`}
                className="hover:underline"
              >
                {[exerciseInfo.name, ...exerciseInfo.aliases]
                  .filter((name) => name.length >= 4)
                  .sort((a, b) => a.length - b.length)[0]!
                  .replace("Barbell", "")}
              </Link>
            )}
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
                    exercise={exerciseInfo}
                    set={{
                      __typename: "WorkoutSet",
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
                  void snoozeExerciseSchedule({
                    variables: {
                      input: {
                        exerciseScheduleId: dueSet.scheduleEntry.id,
                        snoozedUntil: addDays(dueSet.dueOn, 1),
                      },
                    },
                    optimisticResponse: {
                      snoozeExerciseSchedule: {
                        __typename: "SnoozeExerciseSchedulePayload",
                        exerciseSchedule: {
                          ...dueSet.scheduleEntry,
                          snoozedUntil: addDays(dueSet.dueOn, 1),
                          nextSet: {
                            ...dueSet,
                            dueOn: addDays(dueSet.dueOn, 1),
                          },
                        },
                      },
                    },
                  })
                }
                className={
                  "text-md cursor-pointer rounded-xl bg-yellow-500/80 px-3 py-1 leading-none font-semibold text-white disabled:bg-gray-200 disabled:opacity-50"
                }
              >
                Snooze
              </button>
              {dueSet.scheduleEntry.snoozedUntil &&
                isFuture(dueSet.scheduleEntry.snoozedUntil) && (
                  <div className="w-full text-center text-sm text-black/60">
                    <small>
                      Snoozed until{" "}
                      {dueSet.scheduleEntry.snoozedUntil.toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                    </small>
                    <button
                      type="button"
                      onClick={() =>
                        void unsnoozeExerciseSchedule({
                          variables: {
                            input: {
                              exerciseScheduleId: dueSet.scheduleEntry.id,
                            },
                          },
                          optimisticResponse: {
                            unsnoozeExerciseSchedule: {
                              __typename: "UnsnoozeExerciseSchedulePayload",
                              exerciseSchedule: {
                                ...dueSet.scheduleEntry,
                                snoozedUntil: null,
                                nextSet: {
                                  ...dueSet,
                                  dueOn: addMilliseconds(
                                    (dueSet?.workedOutAt &&
                                    isEqual(
                                      dueSet.workedOutAt,
                                      startOfDay(dueSet.workedOutAt, {
                                        in: tz("UTC"),
                                      }),
                                    )
                                      ? addHours(
                                          dueSet.workedOutAt,
                                          dayStartHour,
                                        )
                                      : dueSet.workedOutAt) || epoch,
                                    durationToMs(
                                      dueSet.scheduleEntry.frequency,
                                    ),
                                  ),
                                },
                              },
                            },
                          },
                        })
                      }
                      className="ml-2 cursor-pointer rounded-xl bg-red-500/80 px-2 py-0.5 leading-none font-semibold text-white"
                    >
                      Unsnooze
                    </button>
                  </div>
                )}
              {exerciseInfo.isHidden ? null : (
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
              {dueSet.exerciseId in exerciseIdToDataSourceMapping &&
              exerciseIdToDataSourceMapping[dueSet.exerciseId] ? (
                <div className="rounded-md border border-black/20 bg-white p-1">
                  <UserStuffSourcesForm
                    sourceOptions={
                      exerciseIdToDataSourceMapping[dueSet.exerciseId]!
                    }
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DiaryAgendaDayEntry>
    );
  },
);
