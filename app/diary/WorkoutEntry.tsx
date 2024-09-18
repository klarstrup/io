"use client";

import { Session } from "next-auth";
import { Fragment, useState } from "react";
import { AssistType, exercises } from "../../models/exercises";
import type { WorkoutData } from "../../models/workout";
import { WorkoutForm } from "./WorkoutForm";

export default function WorkoutEntry({
  workout,
  user,
}: {
  workout: WorkoutData & { _id: string };
  user: Session["user"];
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div key={workout._id}>
      {workout.worked_out_at > new Date(2024, 6, 26) ? (
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
                    <li key={setIndex}>
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
                              {input.value} {input.unit}
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
