"use client";

import { Session } from "next-auth";
import { Fragment, useState } from "react";
import { StealthButton } from "../../components/StealthButton";
import Grade from "../../grades";
import { AssistType, exercises, InputType, Unit } from "../../models/exercises";
import { WorkoutData, WorkoutSource } from "../../models/workout";
import { seconds2time } from "../../utils";
import ProblemByProblem from "../[[...slug]]/ProblemByProblem";
import { WorkoutForm } from "./WorkoutForm";

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
  user,
  locations,
}: {
  workout: WorkoutData & { _id: string };
  user: Session["user"];
  locations: string[];
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      key={workout._id}
      style={{
        marginBottom: "4px",
        borderLeft: "0.25em solid #a0a0a0a0",
        paddingLeft: "0.5em",
        borderRight: "0.25em solid #a0a0a0a0",
        paddingRight: "0.5em",
        borderRadius: "0.5em",
      }}
    >
      <small>
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
          <>
            <small>Fitocracy</small>
          </>
        ) : workout.source === WorkoutSource.MyFitnessPal ? (
          <>
            <small>MyFitnessPal</small>
          </>
        ) : workout.source === WorkoutSource.RunDouble ? (
          <>
            <small>RunDouble</small>
          </>
        ) : workout.source === WorkoutSource.TopLogger ? (
          <>
            <small>TopLogger</small>
          </>
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
      {isEditing ? (
        <WorkoutForm
          user={user}
          workout={workout}
          locations={locations}
          onClose={() => setIsEditing(false)}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gap: "8px 4px",
            gridTemplateColumns:
              workout.exercises.length > 1 ? "50% 50%" : undefined,
          }}
        >
          {workout.exercises.map((workoutGroup, exerciseIndex) => {
            const exercise = exercises.find(
              ({ id }) => workoutGroup.exercise_id === id
            )!;
            return (
              <div key={exerciseIndex}>
                <span style={{ fontWeight: 600, fontSize: "0.9em" }}>
                  {
                    [exercise.name, ...exercise.aliases]
                      .filter((name) => name.length >= 4)
                      .sort((a, b) => a.length - b.length)[0]!
                  }
                </span>
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
                  <ol
                    style={{
                      paddingInlineStart:
                        workoutGroup.sets.length === 1 ? 0 : "1em",
                      marginBlockStart: 0,
                      marginBlockEnd: 0,
                    }}
                  >
                    {workoutGroup.sets.map((set, setIndex) => (
                      <li
                        key={setIndex}
                        style={{
                          listStyleType:
                            workoutGroup.sets.length === 1 ? "none" : "decimal",
                          fontSize: "0.8em",
                        }}
                      >
                        <div
                          style={{ fontSize: "1.25em", whiteSpace: "nowrap" }}
                        >
                          {set.inputs
                            .filter((input) => {
                              if (
                                input.assist_type === AssistType.Assisted ||
                                input.assist_type === AssistType.Weighted
                              ) {
                                return input.value !== 0;
                              }

                              return input.value !== null;
                            })
                            .map((input, i) => {
                              const inputDefinition =
                                exercise.inputs[input.id]!;
                              const inputOptions =
                                input.type === InputType.Options &&
                                "options" in inputDefinition &&
                                inputDefinition.options;

                              return (
                                <Fragment key={input.id}>
                                  {i > 0
                                    ? input.type === InputType.Options
                                      ? ", "
                                      : input.assist_type ===
                                        AssistType.Assisted
                                      ? " - "
                                      : input.assist_type ===
                                        AssistType.Weighted
                                      ? " + "
                                      : " × "
                                    : ""}
                                  <span
                                    style={{
                                      fontVariantNumeric: "tabular-nums",
                                    }}
                                  >
                                    {input.type === InputType.Pace ? (
                                      <>
                                        {decimalAsTime(input.value)}
                                        <small>min/km</small>
                                      </>
                                    ) : input.type === InputType.Time ? (
                                      <>
                                        {seconds2time(Math.round(input.value))}
                                      </>
                                    ) : input.type === InputType.Distance ? (
                                      <>
                                        {(input.unit === Unit.M
                                          ? input.value / 1000
                                          : input.value
                                        ).toLocaleString("en-US", {
                                          unit: "kilometer",
                                          maximumSignificantDigits: 2,
                                        })}
                                        <small>km</small>
                                      </>
                                    ) : input.type === InputType.Options &&
                                      inputOptions ? (
                                      <>
                                        {String(
                                          inputOptions[input.value]?.value
                                        )}
                                      </>
                                    ) : input.unit === Unit.FrenchRounded ? (
                                      new Grade(input.value).name
                                    ) : (
                                      <>
                                        {input.value}
                                        <small>{input.unit}</small>
                                      </>
                                    )}
                                  </span>
                                </Fragment>
                              );
                            })}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
