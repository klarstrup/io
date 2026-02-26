import Link from "next/link";
import { ExerciseName } from "../../components/ExerciseName";
import { FieldSetX } from "../../components/FieldSet";
import { GQWorkout } from "../../graphql.generated";
import { PRType } from "../../lib";
import { exercisesById } from "../../models/exercises";
import {
  ClimbingStats,
  isClimbingExercise,
  WorkoutSource,
} from "../../models/workout";
import { dateToString } from "../../utils";
import { WorkoutEntryDuplicateButton } from "./WorkoutEntryDuplicateButton";
import { WorkoutEntryExercise } from "./WorkoutEntryExercise";

export default function WorkoutEntry({
  showDate,
  showExerciseName = true,
  showLocation = true,
  showSource = true,
  workout,
  exerciseSetPRs,
  onlyPRs,
}: {
  showDate?: boolean;
  showExerciseName?: boolean;
  showLocation?: boolean;
  showSource?: boolean;
  workout: GQWorkout;
  exerciseSetPRs?: Record<PRType, boolean>[][];
  onlyPRs?: PRType;
}) {
  const workoutDateStr = dateToString(workout.workedOutAt);

  const location = workout.location;

  const locationName = location?.name ?? workout.location?.name ?? null;

  return (
    <FieldSetX
      key={workout.id}
      className={"relative min-w-[50%] " + (showDate ? "w-full" : "")}
      legend={
        <small className="-ml-2 block leading-none">
          {showDate ? (
            <div className="block text-xs font-semibold">
              <Link
                prefetch={false}
                href={`/diary/${workoutDateStr}`}
                style={{ color: "#edab00" }}
              >
                <small>{workoutDateStr}</small>
              </Link>
              {showLocation && locationName ? (
                <small>
                  {" "}
                  -{" "}
                  <Link
                    prefetch={false}
                    href={`/diary/locations/${location?.id}`}
                    className="font-bold"
                    style={{ color: "#edab00" }}
                  >
                    {locationName}
                  </Link>
                </small>
              ) : null}
            </div>
          ) : showLocation && locationName ? (
            <div>
              <small>
                <Link
                  prefetch={false}
                  href={`/diary/locations/${location?.id}`}
                  className="font-bold"
                  style={{ color: "#edab00" }}
                >
                  {locationName}
                </Link>
              </small>
            </div>
          ) : null}
          {showExerciseName && showLocation && showSource ? (
            <div>
              {workout.source === WorkoutSource.Self || !workout.source ? (
                <>
                  <small>You</small>
                  <>
                    {" "}
                    <small>-</small>{" "}
                    <Link
                      prefetch={false}
                      href={`/diary/${workoutDateStr}/workout/${workout.id}`}
                      style={{ color: "#edab00" }}
                      className="text-xs font-semibold"
                    >
                      Edit
                    </Link>
                    {workoutDateStr !== dateToString(new Date()) &&
                    // disable for now until fixed
                    // eslint-disable-next-line react-hooks/purity
                    Math.random() > 1 ? (
                      <>
                        {" "}
                        <small>-</small>{" "}
                        <WorkoutEntryDuplicateButton workout={workout} />
                      </>
                    ) : null}
                  </>
                </>
              ) : workout.source === WorkoutSource.Fitocracy ? (
                <small>Fitocracy</small>
              ) : workout.source === WorkoutSource.MyFitnessPal ? (
                <small>MyFitnessPal</small>
              ) : workout.source === WorkoutSource.RunDouble ? (
                <small>RunDouble</small>
              ) : workout.source === WorkoutSource.TopLogger ? (
                <small>TopLogger</small>
              ) : workout.source === WorkoutSource.KilterBoard ? (
                <small>Kilter Board</small>
              ) : workout.source === WorkoutSource.MoonBoard ? (
                <small>MoonBoard</small>
              ) : workout.source === WorkoutSource.Grippy ? (
                <small>Grippy</small>
              ) : workout.source === WorkoutSource.Crimpd ? (
                <small>Crimpd</small>
              ) : workout.source === WorkoutSource.ClimbAlong ? (
                <small>Climbalong</small>
              ) : workout.source === WorkoutSource.Onsight ? (
                <small>Onsight</small>
              ) : null}
            </div>
          ) : null}
        </small>
      }
    >
      {!(showExerciseName && showLocation && showSource) &&
      (workout.source === WorkoutSource.Self || !workout.source) ? (
        <Link
          prefetch={false}
          href={`/diary/${workoutDateStr}/workout/${workout.id}`}
          style={{ color: "#edab00" }}
          className="absolute top-1 right-2 text-xs font-semibold"
        >
          ⏎
        </Link>
      ) : null}
      <div
        style={{
          display: "grid",
          gap: "8px",
          gridTemplateColumns:
            workout.exercises.length > 1
              ? "repeat(auto-fit, minmax(148px, 1fr))"
              : "100%",
        }}
      >
        {workout.exercises.map((workoutExercise, exerciseIndex) => {
          const exercise = exercisesById.get(workoutExercise.exerciseId)!;

          return (
            <div key={exerciseIndex}>
              <div className="flex flex-wrap gap-1">
                {showExerciseName || workoutExercise.displayName ? (
                  <Link
                    prefetch={false}
                    href={`/diary/exercises/${exercise.id}`}
                    style={{ color: "#edab00" }}
                    className="block text-sm leading-none font-bold"
                  >
                    {workoutExercise.displayName ?? (
                      <ExerciseName exerciseInfo={exercise} />
                    )}
                  </Link>
                ) : null}
                {isClimbingExercise(exercise.id) ? (
                  <ClimbingStats
                    setAndLocationPairs={workoutExercise.sets.map((set) => [
                      set,
                      location ?? undefined,
                      workout,
                    ])}
                  />
                ) : null}
              </div>
              {workoutExercise.comment ? (
                <div className="pb-1 text-xs whitespace-nowrap italic">
                  {workoutExercise.comment}
                </div>
              ) : null}
              <WorkoutEntryExercise
                exercise={exercise}
                setsWithLocations={workoutExercise.sets.map((set) => [
                  set,
                  location ?? undefined,
                  workout,
                ])}
                exerciseIndex={exerciseIndex}
                exerciseSetPRs={exerciseSetPRs}
                onlyPRs={onlyPRs}
              />
            </div>
          );
        })}
      </div>
    </FieldSetX>
  );
}
