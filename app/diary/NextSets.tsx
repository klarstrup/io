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
        ({ exerciseId, successful, nextWorkingSet, workedOutAt }) => {
          const exercise = exercises.find(({ id }) => exerciseId === id)!;

          return (
            <li key={exercise.id}>
              {onAddExercise ? (
                <StealthButton onClick={() => onAddExercise(exercise.id)}>
                  ➕
                </StealthButton>
              ) : null}{" "}
              <b>
                {
                  [exercise.name, ...exercise.aliases]
                    .filter((name) => name.length >= 4)
                    .sort((a, b) => a.length - b.length)[0]!
                }{" "}
                {successful ? null : " (failed)"}
              </b>{" "}
              {nextWorkingSet}kg{" "}
              <small>
                <small>
                  Last set {String(workedOutAt.toLocaleDateString("da-DK"))}
                </small>
              </small>
            </li>
          );
        }
      )}
    </ol>
  );
}
