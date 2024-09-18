"use client";

import { Session } from "next-auth";
import { Fragment, useState } from "react";
import { AssistType, exercises, InputType, Unit } from "../../models/exercises";
import { WorkoutData, WorkoutSource } from "../../models/workout";
import { seconds2time } from "../../utils";
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
}: {
  workout: WorkoutData & { _id: string };
  user: Session["user"];
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      key={workout._id}
      style={{
        marginBottom: "4px",
        borderLeft: "0.25em solid #a0a0a0a0",
        paddingLeft: "0.5em",
      }}
    >
      {workout.source === WorkoutSource.Self || !workout.source ? (
        !isEditing ? (
          <button onClick={() => setIsEditing(!isEditing)}>Edit</button>
        ) : null
      ) : null}
      {isEditing ? (
        <WorkoutForm
          user={user}
          workout={workout}
          onClose={() => setIsEditing(false)}
        />
      ) : (
        <div
          key={workout._id}
          style={{
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {workout.exercises.map((workoutGroup, exerciseIndex) => {
            const exercise = exercises.find(
              ({ id }) => workoutGroup.exercise_id === id
            )!;
            return (
              <div key={exerciseIndex}>
                <b>
                  {
                    [...exercise.aliases, exercise.name]
                      .filter((name) => name.length >= 4)
                      .sort((a, b) => a.length - b.length)[0]!
                  }
                </b>
                <ol>
                  {workoutGroup.sets.map((set, setIndex) => (
                    <li
                      key={setIndex}
                      style={{
                        listStyleType:
                          workoutGroup.sets.length === 1 ? "none" : "decimal",
                      }}
                    >
                      {set.inputs
                        .filter((input) => {
                          if (
                            input.assist_type === AssistType.Assisted ||
                            input.assist_type === AssistType.Weighted
                          ) {
                            return input.value !== 0;
                          }

                          return true;
                        })
                        .map((input, i) => (
                          <Fragment key={input.id}>
                            {i > 0
                              ? input.assist_type === AssistType.Assisted
                                ? " - "
                                : input.assist_type === AssistType.Weighted
                                ? " + "
                                : " × "
                              : ""}
                            <span>
                              {input.type === InputType.Pace ? (
                                <>
                                  {decimalAsTime(input.value)}
                                  <small>min/km</small>
                                </>
                              ) : input.type === InputType.Time ? (
                                <>{seconds2time(Math.round(input.value))}</>
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
                              ) : (
                                <>
                                  {input.value}
                                  <small>{input.unit}</small>
                                </>
                              )}
                            </span>
                          </Fragment>
                        ))}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
