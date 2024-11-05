"use client";

import { Session } from "next-auth";
import { Fragment, ReactNode, useState } from "react";
import { StealthButton } from "../../../components/StealthButton";
import Grade from "../../../grades";
import {
  AssistType,
  exercises,
  InputType,
  Unit,
} from "../../../models/exercises";
import {
  WorkoutData,
  WorkoutExerciseSet,
  WorkoutExerciseSetInput,
  WorkoutSource,
} from "../../../models/workout";
import type { getNextSets } from "../../../models/workout.server";
import { omit, seconds2time } from "../../../utils";
import ProblemByProblem from "../../[[...slug]]/ProblemByProblem";
import { WorkoutForm } from "./WorkoutForm";
import { FieldSetX } from "../../../components/FieldSet";

function pad(i: number, width: number, z = "0") {
  const n = String(i);
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function decimalAsTime(dec: number) {
  const minutes = Math.floor(dec);
  const sec = Math.floor(60 * (dec - minutes));
  return String(minutes) + ":" + pad(sec, 2);
}

export default function WorkoutEntry({
  workout,
  exerciseSetPRs,
  date,
  user,
  locations,
  nextSets,
}: {
  workout: WorkoutData & { _id: string };
  exerciseSetPRs?: {
    isAllTimePR: boolean;
    isYearPR: boolean;
    is3MonthPR: boolean;
  }[][];
  date: `${number}-${number}-${number}`;
  user: Session["user"];
  locations: string[];
  nextSets?: Awaited<ReturnType<typeof getNextSets>>;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <FieldSetX
      key={workout._id}
      className="min-w-[50%]"
      legend={
        <small className="-ml-2">
          {workout.source === WorkoutSource.Self || !workout.source ? (
            <>
              <small>You</small>
              {!isEditing ? (
                <>
                  {" "}
                  <small>-</small>{" "}
                  <StealthButton
                    onClick={() => setIsEditing(!isEditing)}
                    style={{
                      fontSize: "12px",
                      color: "#edab00",
                      fontWeight: 600,
                    }}
                  >
                    Edit
                  </StealthButton>
                </>
              ) : null}
            </>
          ) : workout.source === WorkoutSource.Fitocracy ? (
            <small>Fitocracy</small>
          ) : workout.source === WorkoutSource.MyFitnessPal ? (
            <small>MyFitnessPal</small>
          ) : workout.source === WorkoutSource.RunDouble ? (
            <small>RunDouble</small>
          ) : workout.source === WorkoutSource.TopLogger ? (
            <small>TopLogger</small>
          ) : null}
          {workout.location ? (
            <>
              {" "}
              <small>
                <small>@</small>
              </small>{" "}
              <small>{workout.location}</small>
            </>
          ) : null}
        </small>
      }
    >
      {isEditing ? (
        <WorkoutForm
          date={date}
          user={user}
          workout={workout}
          locations={locations}
          onClose={() => setIsEditing(false)}
          nextSets={nextSets}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gap: "8px 4px",
            gridTemplateColumns:
              workout.exercises.length > 1
                ? "repeat(auto-fit, minmax(128px, 1fr))"
                : "100%",
          }}
        >
          {workout.exercises.map((workoutGroup, exerciseIndex) => {
            const exercise = exercises.find(
              ({ id }) => workoutGroup.exerciseId === id,
            )!;
            return (
              <div key={exerciseIndex}>
                <div className="text-sm font-bold leading-none">
                  {
                    [exercise.name, ...exercise.aliases]
                      .filter((name) => name.length >= 4)
                      .sort((a, b) => a.length - b.length)[0]!
                  }
                </div>
                {exercise.id === 2001 ? (
                  (() => {
                    const colorOptions =
                      exercise.inputs[1] &&
                      "options" in exercise.inputs[1] &&
                      exercise.inputs[1].options;
                    if (!colorOptions) return null;
                    return (
                      <div style={{ fontSize: "1.5em" }}>
                        <ProblemByProblem
                          problemByProblem={workoutGroup.sets.map((set, i) => ({
                            grade: set.inputs[0]!.value,
                            color:
                              colorOptions[set.inputs[1]!.value]?.value ?? "",
                            flash: set.inputs[2]!.value === 0,
                            top: set.inputs[2]!.value <= 1,
                            zone: set.inputs[2]!.value <= 2,
                            number: String(i + 1),
                            attempt: true,
                          }))}
                        />
                      </div>
                    );
                  })()
                ) : (
                  <table className="inline-table w-auto max-w-0">
                    <tbody>
                      {workoutGroup.sets.reduce(
                        (memo: ReactNode[], set, setIndex) => {
                          const previousSet = workoutGroup.sets[setIndex - 1];
                          const nextSet = workoutGroup.sets[setIndex + 1];

                          if (nextSet && isEquivalentSet(set, nextSet)) {
                            return memo;
                          }
                          let repeatCount: number | null = null;
                          if (
                            previousSet &&
                            isEquivalentSet(set, previousSet)
                          ) {
                            repeatCount = 1;

                            for (
                              let i = setIndex - 1;
                              i >= 0 &&
                              workoutGroup.sets[i] &&
                              isEquivalentSet(set, workoutGroup.sets[i]!);
                              i--
                            ) {
                              repeatCount++;
                            }
                          }

                          const setPR =
                            exerciseSetPRs?.[exerciseIndex]?.[setIndex];

                          memo.push(
                            <tr
                              key={setIndex}
                              className="whitespace-nowrap text-lg leading-tight"
                            >
                              {repeatCount &&
                              !set.inputs.some(
                                (_, i) =>
                                  exercise.inputs[i]?.type === InputType.Reps,
                              ) ? (
                                <Fragment>
                                  <td
                                    className="p-0 tabular-nums"
                                    width="0.01%"
                                  >
                                    {repeatCount}
                                  </td>
                                  <td className="p-0">×</td>
                                </Fragment>
                              ) : (
                                <Fragment>
                                  <td className="p-0" />
                                  <td className="p-0" />
                                </Fragment>
                              )}
                              {set.inputs
                                .map((input, index) => {
                                  const inputDefinition =
                                    exercise.inputs[index]!;
                                  const inputOptions =
                                    inputDefinition.type ===
                                      InputType.Options &&
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
                                          seconds2time(Math.round(input.value))
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
                                        ) : inputType === InputType.Options &&
                                          inputOptions ? (
                                          String(
                                            inputOptions[input.value]?.value,
                                          )
                                        ) : input.unit ===
                                          Unit.FrenchRounded ? (
                                          new Grade(input.value).name
                                        ) : !isNaN(input.value) &&
                                          input.value !== undefined &&
                                          input.value !== null &&
                                          (inputType === InputType.Weightassist
                                            ? input.value !== 0
                                            : true) ? (
                                          <>
                                            {input.value}
                                            {!(
                                              input.unit === Unit.Reps &&
                                              set.inputs.some(
                                                (_, i) =>
                                                  exercise.inputs[i]?.type ===
                                                  InputType.Weight,
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
                                    Number(
                                      exercise.inputs[b.index]?.type ===
                                        InputType.Reps,
                                    ) -
                                    Number(
                                      exercise.inputs[a.index]?.type ===
                                        InputType.Reps,
                                    ),
                                )
                                .map(({ element, input, index }, elIndex) => (
                                  <Fragment key={index}>
                                    <td className="p-0 px-0.5">
                                      {elIndex > 0 &&
                                      !isNaN(input.value) &&
                                      input.value !== undefined &&
                                      input.value !== null &&
                                      (exercise.inputs[index]?.type ===
                                      InputType.Weightassist
                                        ? input.value !== 0
                                        : true)
                                        ? exercise.inputs[index]?.type ===
                                          InputType.Options
                                          ? ", "
                                          : input.assistType ===
                                              AssistType.Assisted
                                            ? " - "
                                            : input.assistType ===
                                                AssistType.Weighted
                                              ? " + "
                                              : " × "
                                        : ""}
                                    </td>
                                    <td
                                      width="0.01%"
                                      className="p-0 text-right"
                                    >
                                      {repeatCount &&
                                      exercise.inputs[index]?.type ===
                                        InputType.Reps ? (
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
                                  className="p-0 pl-1 text-left text-[10px] leading-[0]"
                                  title={
                                    setPR.isAllTimePR
                                      ? "All-time PR"
                                      : setPR.isYearPR
                                        ? "Year PR"
                                        : setPR.is3MonthPR
                                          ? "3-month PR"
                                          : undefined
                                  }
                                >
                                  {setPR.isAllTimePR
                                    ? "🥇"
                                    : setPR.isYearPR
                                      ? "🥈"
                                      : setPR.is3MonthPR
                                        ? "🥉"
                                        : null}
                                </td>
                              ) : null}
                            </tr>,
                          );

                          return memo;
                        },
                        [],
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </FieldSetX>
  );
}

const normalizeInput = (input: WorkoutExerciseSetInput) =>
  // @ts-expect-error -- old data might have input id
  omit(input, "id");
function isEquivalentSet(setA: WorkoutExerciseSet, setB: WorkoutExerciseSet) {
  return (
    JSON.stringify(setA.inputs.map(normalizeInput)) ===
    JSON.stringify(setB.inputs.map(normalizeInput))
  );
}
