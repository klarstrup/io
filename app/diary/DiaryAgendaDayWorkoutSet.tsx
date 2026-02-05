import { useApolloClient } from "@apollo/client/react";
import { useSortable } from "@dnd-kit/sortable";
import { faDumbbell } from "@fortawesome/free-solid-svg-icons";
import { isSameDay, max, min, subHours } from "date-fns";
import Link from "next/link";
import {
  ExerciseInfo,
  Location,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "../../graphql.generated";
import {
  ClimbingStats,
  isClimbingExercise,
  WorkoutSource,
} from "../../models/workout";
import { cotemporality, dayStartHour } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { WorkoutEntryExercise } from "./WorkoutEntryExercise";

export function DiaryAgendaDayWorkoutSet({
  workout,
  workoutExercise,
  exerciseInfo,
  setsWithLocation,
  mostRecentWorkout,
  workoutDateStr,
}: {
  workout: Workout;
  workoutExercise: WorkoutExercise;
  exerciseInfo: ExerciseInfo;
  setsWithLocation: (readonly [WorkoutSet, Location | undefined, Workout])[];
  mostRecentWorkout: Workout | null;
  workoutDateStr: string;
}) {
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
      (client.cache.identify(workout) || workout.id) +
      "-" +
      String(workoutExercise.exerciseId),
    data: {
      date: isSameDay(
        subHours(workout.workedOutAt, dayStartHour),
        subHours(
          setsWithLocation[0]?.[0].createdAt || workout.workedOutAt,
          dayStartHour,
        ),
      )
        ? setsWithLocation[0]?.[0].createdAt || workout.workedOutAt
        : workout.workedOutAt,
    },
    disabled: true,
  });

  return (
    <DiaryAgendaDayEntry
      icon={faDumbbell}
      cotemporality={cotemporality({
        start: min([
          workout.workedOutAt,
          ...workoutExercise.sets.map((s) => s.createdAt).filter(Boolean),
        ]),
        end: max([
          workout.workedOutAt,
          ...workoutExercise.sets.map((s) => s.updatedAt).filter(Boolean),
        ]),
      })}
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
      {...listeners}
      {...attributes}
      isDragging={isDragging}
    >
      <div
        className={
          "inline-flex h-auto justify-center rounded-md " +
          (isClimbingExercise(workoutExercise.exerciseId) ||
          workout.source !== WorkoutSource.Self
            ? " w-full flex-col"
            : " flex-row") +
          (workout.source === WorkoutSource.Self
            ? " border border-black/20 bg-white"
            : "")
        }
      >
        <div
          className={
            "flex w-32 flex-col flex-wrap items-stretch justify-center self-stretch rounded-l-[5px] leading-tight " +
            (!workoutExercise.sets.length ||
            isClimbingExercise(workoutExercise.exerciseId)
              ? " rounded-r-[5px]"
              : "") +
            (isClimbingExercise(workoutExercise.exerciseId) ? " w-full" : " ") +
            (isClimbingExercise(workoutExercise.exerciseId) &&
            workout.source === WorkoutSource.Self
              ? " py-0.5"
              : " ") +
            (workout.source === WorkoutSource.Self
              ? " bg-black/20 px-1.5 text-sm text-white"
              : "")
          }
        >
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <Link
                prefetch={false}
                href={`/diary/exercises/${exerciseInfo.id}`}
              >
                {[exerciseInfo.name, ...exerciseInfo.aliases]
                  .filter((name) => name.length >= 4)
                  .sort((a, b) => a.length - b.length)[0]!
                  .replace("Barbell", "")}
              </Link>
              {isClimbingExercise(exerciseInfo.id) ? (
                <ClimbingStats setAndLocationPairs={setsWithLocation} />
              ) : null}
            </div>
            {mostRecentWorkout &&
            (mostRecentWorkout.source === WorkoutSource.Self ||
              !mostRecentWorkout.source) ? (
              <Link
                prefetch={false}
                href={`/diary/${workoutDateStr}/workout/${mostRecentWorkout.id}`}
                className="text-sm leading-none font-semibold text-orange-200"
              >
                ⏎
              </Link>
            ) : null}
          </div>
        </div>
        {setsWithLocation.length > 0 ? (
          <div
            className={
              "flex flex-1 items-center text-xs " +
              (isClimbingExercise(exerciseInfo.id) ? " pb-1" : " ") +
              (workout.source === WorkoutSource.Self ? " px-1 py-0.5" : "")
            }
          >
            <WorkoutEntryExercise
              exercise={exerciseInfo}
              setsWithLocations={setsWithLocation}
            />
          </div>
        ) : null}
      </div>
    </DiaryAgendaDayEntry>
  );
}
