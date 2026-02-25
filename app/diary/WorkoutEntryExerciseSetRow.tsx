import { Fragment } from "react";
import Grade from "../../grades";
import type {
  ExerciseInfo,
  WorkoutSet,
  WorkoutSetInput,
} from "../../graphql.generated";
import { PRType } from "../../lib";
import {
  AssistType,
  type ExerciseData,
  InputType,
  Unit,
} from "../../models/exercises.types";
import type {
  WorkoutExerciseSet,
  WorkoutExerciseSetInput,
} from "../../models/workout";
import { HOUR_IN_SECONDS, MINUTE_IN_SECONDS, seconds2time } from "../../utils";

function pad(i: number, width: number, z = "0") {
  const n = String(i);
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function decimalAsTime(dec: number) {
  const minutes = Math.floor(dec);
  const sec = Math.floor(60 * (dec - minutes));
  return String(minutes) + ":" + pad(sec, 2);
}

export function WorkoutEntryExerciseSetRow({
  set,
  repeatCount,
  exercise,
  setPR,
}: {
  set: WorkoutExerciseSet | WorkoutSet;
  repeatCount?: number | null;
  exercise: ExerciseData | ExerciseInfo;
  setPR?: Record<PRType, boolean>;
}) {
  return (
    <Fragment>
      <tr className="align-baseline whitespace-nowrap">
        {repeatCount &&
        !set.inputs.some(
          (_, i) => exercise.inputs[i]?.type === InputType.Reps,
        ) ? (
          <Fragment>
            <td className="p-0 text-right tabular-nums" width="0.01%">
              {repeatCount}
            </td>
            {set.inputs.length ? <td className="px-0.5 py-0">×</td> : null}
          </Fragment>
        ) : (
          <Fragment>
            <td className="p-0" />
            <td className="p-0" />
          </Fragment>
        )}
        {set.inputs.length ? (
          set.inputs
            .map(
              (
                input: WorkoutExerciseSetInput | WorkoutSetInput,
                index: number,
              ) => {
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
                      {inputType === InputType.Pace && input.value ? (
                        <>
                          {decimalAsTime(input.value)}
                          <small>min/km</small>
                        </>
                      ) : inputType === InputType.Time && input.value ? (
                        seconds2time(
                          input.unit === Unit.Hr
                            ? input.value * HOUR_IN_SECONDS
                            : input.unit === Unit.Min
                              ? input.value * MINUTE_IN_SECONDS
                              : input.value,
                        )
                      ) : inputType === InputType.Distance && input.value ? (
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
                      ) : inputType === InputType.Options &&
                        inputOptions &&
                        input.value != undefined ? (
                        String(inputOptions[input.value]?.value ?? "")
                      ) : input.unit === Unit.FrenchRounded &&
                        input.value != undefined ? (
                        new Grade(input.value).name
                      ) : input.value != undefined &&
                        !isNaN(input.value) &&
                        input.value !== undefined &&
                        input.value !== null &&
                        (inputType === InputType.Weightassist
                          ? input.value !== 0
                          : true) ? (
                        <>
                          {input.value.toLocaleString("en-DK", {
                            maximumFractionDigits: 2,
                          })}
                          {set.inputs.length === 1 ||
                          !(
                            inputDefinition.type === InputType.Reps &&
                            set.inputs.some(
                              (_, i) =>
                                exercise.inputs[i]?.type === InputType.Weight ||
                                exercise.inputs[i]?.type ===
                                  InputType.Weightassist,
                            )
                          ) ? (
                            <small>{input.unit}</small>
                          ) : null}
                        </>
                      ) : null}
                    </span>
                  ),
                };
              },
            )
            .sort(
              (a, b) =>
                Number(exercise.inputs[b.index]?.type === InputType.Reps) -
                Number(exercise.inputs[a.index]?.type === InputType.Reps),
            )
            .map(({ element, input, index }, elIndex) => {
              const separator =
                elIndex > 0 &&
                input.value != undefined &&
                !isNaN(input.value) &&
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
                  : "";
              return (
                <Fragment key={index}>
                  <td
                    className={
                      separator
                        ? /* prettier-ignore */
                          separator === " - "
                          ? "p-0 pl-0.5"
                          : "p-0 px-0.5"
                        : "p-0"
                    }
                  >
                    {separator}
                  </td>
                  <td width="0.01%" className="p-0 text-right">
                    {repeatCount &&
                    repeatCount > 1 &&
                    exercise.inputs[index]?.type === InputType.Reps ? (
                      <>
                        <span>{repeatCount}</span>
                        <span className="px-0.5">×</span>
                      </>
                    ) : null}
                    {element}
                  </td>
                </Fragment>
              );
            })
        ) : repeatCount ? (
          <Fragment>
            <td className="p-0"></td>
            <td width="0.01%" className="p-0 text-right">
              <small>sets</small>
            </td>
          </Fragment>
        ) : null}
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
