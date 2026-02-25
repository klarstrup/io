import { useApolloClient } from "@apollo/client/react";
import { useSortable } from "@dnd-kit/sortable";
import { faDumbbell } from "@fortawesome/free-solid-svg-icons";
import { max, min } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExerciseName } from "../../components/ExerciseName";
import type {
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
import { cotemporality } from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { WorkoutEntryExercise } from "./WorkoutEntryExercise";
import { getJournalEntryPrincipalDate } from "./diaryUtils";

export function DiaryAgendaDayWorkout({
  location,
  workout,
  workoutDateStr,
  cotemporalityOfSurroundingEvent,
}: {
  location?: Location;
  workout: Workout;
  workoutDateStr: string;
  cotemporalityOfSurroundingEvent?: ReturnType<typeof cotemporality> | null;
}) {
  const router = useRouter();
  const client = useApolloClient();
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: client.cache.identify(workout) || workout.id,
    data: {
      date: getJournalEntryPrincipalDate(workout)!.start,
      workout,
    },
    disabled: workout.source !== WorkoutSource.Self,
  });

  return (
    <DiaryAgendaDayEntry
      icon={faDumbbell}
      cotemporalityOfSurroundingEvent={
        !isDragging ? cotemporalityOfSurroundingEvent : null
      }
      cotemporality={cotemporality({
        start: min([
          workout.workedOutAt,
          ...workout.exercises
            .flatMap((we) => we.sets.map((s) => s.createdAt))
            .filter(Boolean),
        ]),
        end: max([
          workout.workedOutAt,
          ...workout.exercises
            .flatMap((we) => we.sets.map((s) => s.updatedAt))
            .filter(Boolean),
        ]),
      })}
      ref={setNodeRef}
      style={{
        transition,
        ...(transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: 5,
            }
          : undefined),
        ...(isDragging ? { zIndex: 10 } : {}),
      }}
      {...listeners}
      {...attributes}
      onIconClick={
        workout.source === WorkoutSource.Self || !workout.source
          ? () => router.push(`/diary/${workoutDateStr}/workout/${workout.id}`)
          : undefined
      }
      className="select-none"
    >
      {workout.exercises.filter((we) => !isClimbingExercise(we.exerciseId))
        .length ? (
        <div
          className={
            "flex flex-row gap-1 px-1" +
            (workout.source === WorkoutSource.Self
              ? " rounded-[5px] border border-black/20 bg-white"
              : "")
          }
        >
          {workout.exercises
            .filter((we) => !isClimbingExercise(we.exerciseId))
            .map((we) => (
              <DiaryAgendaDayWorkoutSet
                key={we.exerciseId}
                workout={workout}
                workoutExercise={we}
                location={location}
              />
            ))}
        </div>
      ) : null}
      {workout.exercises
        .filter((we) => isClimbingExercise(we.exerciseId))
        .map((we) => (
          <div
            key={we.exerciseId}
            className={
              "w-full" +
              (workout.source === WorkoutSource.Self
                ? " rounded-[5px] border border-black/20 bg-white px-1 pb-1"
                : "")
            }
          >
            <DiaryAgendaDayWorkoutSet
              key={we.exerciseId}
              workout={workout}
              workoutExercise={we}
              location={location}
            />
          </div>
        ))}
    </DiaryAgendaDayEntry>
  );
}

export function DiaryAgendaDayWorkoutSet({
  workout,
  workoutExercise,
  location,
}: {
  workout: Workout;
  workoutExercise: WorkoutExercise;
  location?: Location;
}) {
  const { exerciseInfo } = workoutExercise;

  const setsWithLocation = workoutExercise.sets.map(
    (set) =>
      [
        {
          ...set,
          meta: (set.meta?.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {}) || {}) as WorkoutSet["meta"],
        },
        location,
        workout,
      ] as const,
  );

  return (
    <div className="flex flex-col">
      <div
        className={
          "flex flex-col flex-wrap items-stretch justify-center leading-tight " +
          (isClimbingExercise(workoutExercise.exerciseId) &&
          workout.source === WorkoutSource.Self
            ? " pb-0.5"
            : "") +
          (!isClimbingExercise(workoutExercise.exerciseId) &&
          workout.source === WorkoutSource.Self
            ? " px-1"
            : "") +
          (workout.source === WorkoutSource.Self ? " text-sm" : "")
        }
      >
        <div className="flex items-baseline gap-2 text-center">
          <Link prefetch={false} href={`/diary/exercises/${exerciseInfo.id}`}>
            {workoutExercise.displayName || (
              <ExerciseName exerciseInfo={exerciseInfo} />
            )}
          </Link>
          {isClimbingExercise(exerciseInfo.id) ? (
            <ClimbingStats setAndLocationPairs={setsWithLocation} />
          ) : null}
        </div>
      </div>
      {setsWithLocation.length > 0 ? (
        <div
          className={
            "flex flex-1 items-start justify-center text-xs " +
            (workout.source === WorkoutSource.Self &&
            !isClimbingExercise(exerciseInfo.id)
              ? " border-t border-t-black/20 px-1"
              : "")
          }
        >
          <WorkoutEntryExercise
            exercise={exerciseInfo}
            setsWithLocations={setsWithLocation}
          />
        </div>
      ) : null}
    </div>
  );
}
