import type { ReactNode } from "react";
import ProblemByProblem, {
  exerciseSetsToProblemByProblem,
} from "../../components/ProblemByProblem";
import Grade from "../../grades";
import {
  GQExerciseInfo,
  GQLocation,
  GQWorkout,
  GQWorkoutSet,
} from "../../graphql.generated";
import { PRType } from "../../lib";
import { type ExerciseData } from "../../models/exercises.types";
import {
  getSetGrade,
  isClimbingExercise,
  type WorkoutData,
  type WorkoutExerciseSet,
  type WorkoutExerciseSetInput,
} from "../../models/workout";
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
  exercise: ExerciseData | GQExerciseInfo;
  setsWithLocations: (readonly [
    WorkoutExerciseSet | GQWorkoutSet,
    GQLocation | undefined,
    workout: WorkoutData | GQWorkout | undefined,
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

const isEquivalentSet = (
  setA: WorkoutExerciseSet | GQWorkoutSet,
  setB: WorkoutExerciseSet | GQWorkoutSet,
) => {
  for (const [index, aInput] of Object.entries(
    setA.inputs as WorkoutExerciseSetInput[],
  )) {
    const bInput = setB.inputs[index] as WorkoutExerciseSetInput;
    for (const key in aInput) {
      if (key !== "id" && aInput[key] !== bInput[key]) return false;
    }
  }
  if (setA.comment !== setB.comment) return false;

  return true;
};
