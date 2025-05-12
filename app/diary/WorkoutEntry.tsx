import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { FieldSetX } from "../../components/FieldSet";
import ProblemByProblem from "../../components/ProblemByProblem";
import Grade from "../../grades";
import { PRType } from "../../lib";
import {
  AssistType,
  exercises,
  InputType,
  SendType,
  Unit,
} from "../../models/exercises";
import {
  calculateClimbingStats,
  isClimbingExercise,
  type WorkoutData,
  type WorkoutExerciseSet,
  type WorkoutExerciseSetInput,
  WorkoutSource,
} from "../../models/workout";
import {
  dateToString,
  HOUR_IN_SECONDS,
  MINUTE_IN_SECONDS,
  omit,
  seconds2time,
} from "../../utils";
import { WorkoutEntryDuplicateButton } from "./WorkoutEntryDuplicateButton";
import type { ObjectId } from "mongodb";

function pad(i: number, width: number, z = "0") {
  const n = String(i);
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function decimalAsTime(dec: number) {
  const minutes = Math.floor(dec);
  const sec = Math.floor(60 * (dec - minutes));
  return String(minutes) + ":" + pad(sec, 2);
}

function WorkoutEntryExerciseSetRow({
  set,
  repeatCount,
  exercise,
  setPR,
}: {
  set: WorkoutExerciseSet;
  repeatCount: number | null;
  exercise: (typeof exercises)[number];
  setPR?: Record<PRType, boolean>;
}) {
  return (
    <Fragment>
      <tr className="text-lg leading-tight whitespace-nowrap">
        {repeatCount &&
        !set.inputs.some(
          (_, i) => exercise.inputs[i]?.type === InputType.Reps,
        ) ? (
          <Fragment>
            <td className="p-0 text-right tabular-nums" width="0.01%">
              {repeatCount}
            </td>
            <td className="px-0.5 py-0">×</td>
          </Fragment>
        ) : (
          <Fragment>
            <td className="p-0" />
            <td className="p-0" />
          </Fragment>
        )}
        {set.inputs
          .map((input, index) => {
            const inputDefinition = exercise.inputs[index]!;
            const inputOptions =
              inputDefinition.type === InputType.Options &&
              "options" in inputDefinition &&
              inputDefinition.options;

            const inputType = inputDefinition.type;
            return {
              input,
              index,
              element: (
                <span className="tabular-nums">
                  {inputType === InputType.Pace ? (
                    <>
                      {decimalAsTime(input.value)}
                      <small>min/km</small>
                    </>
                  ) : inputType === InputType.Time ? (
                    seconds2time(
                      input.unit === Unit.Hr
                        ? input.value * HOUR_IN_SECONDS
                        : input.unit === Unit.Min
                          ? input.value * MINUTE_IN_SECONDS
                          : input.value,
                    )
                  ) : inputType === InputType.Distance ? (
                    <>
                      {(input.unit === Unit.M
                        ? input.value / 1000
                        : input.value
                      ).toLocaleString("en-DK", {
                        unit: "kilometer",
                        maximumSignificantDigits: 2,
                      })}
                      <small>km</small>
                    </>
                  ) : inputType === InputType.Options && inputOptions ? (
                    String(inputOptions[input.value]?.value ?? "")
                  ) : input.unit === Unit.FrenchRounded ? (
                    new Grade(input.value).name
                  ) : !isNaN(input.value) &&
                    input.value !== undefined &&
                    input.value !== null &&
                    (inputType === InputType.Weightassist
                      ? input.value !== 0
                      : true) ? (
                    <>
                      {input.value.toLocaleString("en-DK", {
                        maximumFractionDigits: 2,
                      })}
                      {!(
                        input.unit === Unit.Reps &&
                        set.inputs.some(
                          (_, i) =>
                            exercise.inputs[i]?.type === InputType.Weight,
                        )
                      ) ? (
                        <small>{input.unit}</small>
                      ) : null}
                    </>
                  ) : null}
                </span>
              ),
            };
          })
          .sort(
            (a, b) =>
              Number(exercise.inputs[b.index]?.type === InputType.Reps) -
              Number(exercise.inputs[a.index]?.type === InputType.Reps),
          )
          .map(({ element, input, index }, elIndex) => (
            <Fragment key={index}>
              <td className="p-0 px-0.5">
                {elIndex > 0 &&
                !isNaN(input.value) &&
                input.value !== undefined &&
                input.value !== null &&
                (exercise.inputs[index]?.type === InputType.Weightassist
                  ? input.value !== 0
                  : true)
                  ? exercise.inputs[index]?.type === InputType.Options ||
                    exercise.inputs[index]?.type === InputType.Angle
                    ? ", "
                    : input.assistType === AssistType.Assisted
                      ? " - "
                      : input.assistType === AssistType.Weighted
                        ? " + "
                        : " × "
                  : ""}
              </td>
              <td width="0.01%" className="p-0 text-right">
                {repeatCount &&
                exercise.inputs[index]?.type === InputType.Reps ? (
                  <>
                    <span>{repeatCount}</span>
                    <span className="px-0.5">×</span>
                  </>
                ) : null}
                {element}
              </td>
            </Fragment>
          ))}
        {setPR ? (
          <td
            className="p-0 pl-1 text-left text-[10px] leading-0"
            title={
              setPR.allTimePR
                ? "All-time PR"
                : setPR.oneYearPR
                  ? "Year PR"
                  : setPR.threeMonthPR
                    ? "3-month PR"
                    : undefined
            }
          >
            {setPR.allTimePR
              ? "🥇"
              : setPR.oneYearPR
                ? "🥈"
                : setPR.threeMonthPR
                  ? "🥉"
                  : null}
          </td>
        ) : null}
      </tr>
      {set.comment ? (
        <tr>
          <td />
          <td />
          <td />
          <td
            colSpan={set.inputs.length + 2}
            className="pb-1 text-left text-xs whitespace-nowrap italic"
          >
            {set.comment}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

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
  sets,
  exerciseIndex,
  exerciseSetPRs,
  onlyPRs,
}: {
  exercise: (typeof exercises)[number];
  sets: WorkoutExerciseSet[];
  exerciseIndex: number;
  exerciseSetPRs?: Record<PRType, boolean>[][];
  onlyPRs?: PRType;
}) {
  if (isClimbingExercise(exercise.id)) {
    if (averageGrade) {
      const values = sets.map((set) => set.inputs[0]!.value);
      if (values.filter((value) => value).length) {
        return new Grade(
          average(desc(values).slice(0, Math.floor(values.length / 5) + 1)) ||
            quantile(values, 0.95),
        ).name;
      }
      return null;
    }

    const colorOptions =
      exercise.inputs[1] &&
      "options" in exercise.inputs[1] &&
      exercise.inputs[1].options;

    if (!colorOptions) return null;

    return (
      <ProblemByProblem
        groupByGradeAndFlash={sets.every((set) => set.inputs[0]!.value)}
        groupByColorAndFlash={sets.every((set) => set.inputs[1]!.value > -1)}
        problemByProblem={sets.map((set, i) => {
          const sendType = Number(set.inputs[2]!.value) as SendType;
          return {
            grade: set.inputs[0]!.value,
            color: colorOptions?.[set.inputs[1]!.value]?.value ?? "",
            flash: sendType === SendType.Flash,
            top: sendType === SendType.Top,
            zone: sendType === SendType.Zone,
            attempt: sendType === SendType.Attempt,
            repeat: sendType === SendType.Repeat,
            number: String(i + 1),
            angle: set.inputs[3]?.value,
          };
        })}
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
              setPR={setPR}
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
  workout,
  exerciseSetPRs,
  onlyPRs,
}: {
  showDate?: boolean;
  showExerciseName?: boolean;
  workout: WorkoutData;
  exerciseSetPRs?: Record<PRType, boolean>[][];
  onlyPRs?: PRType;
}) {
  const workoutDateStr = dateToString(workout.workedOutAt);
  return (
    <FieldSetX
      key={workout.id}
      className={"min-w-[50%] " + (showDate ? "w-full" : "")}
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
              {workout.location ? <small> - {workout.location}</small> : null}
            </div>
          ) : workout.location ? (
            <div>
              <small>{workout.location}</small>
            </div>
          ) : null}
          {showExerciseName ? (
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
                    {workoutDateStr !== dateToString(new Date()) ? (
                      <>
                        {" "}
                        <small>-</small>{" "}
                        <WorkoutEntryDuplicateButton
                          workout={omit(
                            workout as WorkoutData & { _id: ObjectId },
                            "_id",
                          )}
                        />
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
          const exercise = exercises.find(
            ({ id }) => workoutExercise.exerciseId === id,
          )!;
          return (
            <div key={exerciseIndex}>
              <div className="flex flex-wrap gap-2">
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
                {isClimbingExercise(exercise.id)
                  ? calculateClimbingStats(
                      workoutExercise.sets.map((set) => [
                        workout.location,
                        set,
                      ]),
                    )
                  : null}
              </div>
              {workoutExercise.comment ? (
                <div className="pb-1 text-xs whitespace-nowrap italic">
                  {workoutExercise.comment}
                </div>
              ) : null}
              <WorkoutEntryExercise
                exercise={exercise}
                sets={workoutExercise.sets}
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
export const isEquivalentSet = (
  setA: WorkoutExerciseSet,
  setB: WorkoutExerciseSet,
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
