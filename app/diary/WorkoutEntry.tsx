"use client";

import { Session } from "next-auth";
import { Fragment, useState } from "react";
import { exercises } from "../../models/exercises";
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
        <button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? "Cancel" : "Edit"}
        </button>
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
                      {set.inputs.map((input, i, l) => (
                        <Fragment key={input.id}>
                          <span>
                            {input.value} {input.unit}
                          </span>
                          {i < l.length - 1 ? " × " : ""}
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
