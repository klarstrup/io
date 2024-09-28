import { StealthButton } from "../../components/StealthButton";
import { exercises } from "../../models/exercises";
import type { getNextSets } from "../../models/workout.server";

export function NextSets({
  nextSets,
  onAddExercise,
}: {
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
  onAddExercise?: (exerciseId: number) => void;
}) {
  return (
    <ol
      style={{
        paddingInlineStart: "20px",
        marginBlockStart: 0,
        marginBlockEnd: 0,
      }}
    >
      {nextSets.map(
        ({ exercise_id, successful, nextWorkingSet, workout_timestamp }) => {
          const exercise = exercises.find(({ id }) => exercise_id === id)!;

          return (
            <li key={exercise.id}>
              {onAddExercise ? (
                <StealthButton onClick={() => onAddExercise(exercise.id)}>
                  ➕
                </StealthButton>
              ) : null}{" "}
              <b>
                {(exercise.aliases[1] || exercise.name).replace("Barbell", "")}{" "}
                {successful ? null : " (failed)"}
              </b>{" "}
              {nextWorkingSet}kg{" "}
              <small>
                <small>
                  Last set{" "}
                  {String(workout_timestamp.toLocaleDateString("da-DK"))}
                </small>
              </small>
            </li>
          );
        }
      )}
    </ol>
  );
}
