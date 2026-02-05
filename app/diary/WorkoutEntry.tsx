import Link from "next/link";
import type { ReactNode } from "react";
import { FieldSetX } from "../../components/FieldSet";
import ProblemByProblem, {
  exerciseSetsToProblemByProblem,
} from "../../components/ProblemByProblem";
import Grade from "../../grades";
import {
  ExerciseInfo,
  Location,
  Workout,
  WorkoutSet,
} from "../../graphql.generated";
import { PRType } from "../../lib";
import { exercisesById } from "../../models/exercises";
import { type ExerciseData } from "../../models/exercises.types";
import {
  ClimbingStats,
  getSetGrade,
  isClimbingExercise,
  type WorkoutData,
  type WorkoutExerciseSet,
  type WorkoutExerciseSetInput,
  WorkoutSource,
} from "../../models/workout";
import { dateToString } from "../../utils";
import { WorkoutEntryDuplicateButton } from "./WorkoutEntryDuplicateButton";
import { WorkoutEntryExerciseSetRow } from "./WorkoutEntryExerciseSetRow";

const average = (arr: number[]) => arr.reduce((a, b) => a + b) / arr.length;

const asc = (arr: number[]) => arr.sort((a: number, b: number) => a - b);
const desc = (arr: number[]) => arr.sort((a: number, b: number) => b - a);
const quantile = (arr: number[], q: number) => {
  const sorted = asc(arr);

  let pos = (sorted.length - 1) * q;
  if (pos % 1 === 0) {
    return sorted[pos]!;
  }

  pos = Math.floor(pos);
  if (sorted[pos + 1] !== undefined) {
    return (sorted[pos]! + sorted[pos + 1]!) / 2;
  }

  return sorted[pos]!;
};

const averageGrade = false;

export function WorkoutEntryExercise({
  exercise,
  setsWithLocations,
  exerciseIndex,
  exerciseSetPRs,
  onlyPRs,
}: {
  exercise: ExerciseData | ExerciseInfo;
  setsWithLocations: (readonly [
    WorkoutExerciseSet | WorkoutSet,
    Location | undefined,
    workout: WorkoutData | Workout | undefined,
  ])[];
  exerciseIndex?: number;
  exerciseSetPRs?: Record<PRType, boolean>[][];
  onlyPRs?: PRType;
}) {
  const sets = setsWithLocations.map(([set]) => set);

  if (isClimbingExercise(exercise.id)) {
    if (averageGrade) {
      const values = sets.map((set) => set.inputs[0]!.value).filter(Boolean);
      if (values.filter((value) => value).length) {
        return new Grade(
          average(desc(values).slice(0, Math.floor(values.length / 5) + 1)) ||
            quantile(values, 0.95),
        ).name;
      }
      return null;
    }

    return (
      <ProblemByProblem
        groupByGradeAndFlash={setsWithLocations.every(([set, location]) =>
          getSetGrade(set, location),
        )}
        groupByColorAndFlash={sets.every(
          (set) => set.inputs[1]!.value && set.inputs[1]!.value > -1,
        )}
        problemByProblem={exerciseSetsToProblemByProblem(setsWithLocations)}
      />
    );
  }

  return (
    <table className="inline-table w-auto max-w-0">
      <tbody>
        {sets.reduce((memo: ReactNode[], set, setIndex, setList) => {
          const previousSet = setList[setIndex - 1];
          const nextSet = setList[setIndex + 1];

          if (nextSet && isEquivalentSet(set, nextSet)) {
            return memo;
          }
          let repeatCount: number | null = null;
          if (previousSet && isEquivalentSet(set, previousSet)) {
            repeatCount = 1;

            for (
              let i = setIndex - 1;
              i >= 0 && setList[i] && isEquivalentSet(set, setList[i]!);
              i--
            ) {
              repeatCount++;
            }
          }

          // PRs are only reported for the first set of a repeated set
          const setPR =
            typeof exerciseIndex === "number" &&
            exerciseSetPRs?.[exerciseIndex]?.[
              setIndex - (repeatCount ? repeatCount - 1 : 0)
            ];
          if (onlyPRs && !setPR?.[onlyPRs]) return memo;

          memo.push(
            <WorkoutEntryExerciseSetRow
              key={setIndex}
              set={set}
              repeatCount={repeatCount}
              exercise={exercise}
              setPR={setPR || undefined}
            />,
          );

          return memo;
        }, [])}
      </tbody>
    </table>
  );
}

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
  workout: Workout;
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
          const exercise = exercisesById[workoutExercise.exerciseId]!;

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
                    {workoutExercise.displayName ??
                      [exercise.name, ...exercise.aliases]
                        .filter((name) => name.length >= 4)
                        .sort((a, b) => a.length - b.length)[0]!
                        .replace("Barbell", "")}
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
const isEquivalentSet = (
  setA: WorkoutExerciseSet | WorkoutSet,
  setB: WorkoutExerciseSet | WorkoutSet,
) => {
  for (const [index, aInput] of Object.entries(setA.inputs)) {
    const bInput = setB.inputs[index] as WorkoutExerciseSetInput;
    for (const key in aInput) {
      if (key !== "id" && aInput[key] !== bInput[key]) return false;
    }
  }
  if (setA.comment !== setB.comment) return false;

  return true;
};
