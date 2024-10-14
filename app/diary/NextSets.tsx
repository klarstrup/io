import { TZDate } from "@date-fns/tz";
import { formatDistanceStrict, startOfDay } from "date-fns";
import { StealthButton } from "../../components/StealthButton";
import { exercises } from "../../models/exercises";
import type { getNextSets } from "../../models/workout.server";
import { DEFAULT_TIMEZONE } from "../../utils";

export function NextSets({
  nextSets,
  onAddExercise,
}: {
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
  onAddExercise?: (exerciseId: number) => void;
}) {
  return (
    <ol style={{ paddingInlineStart: "20px" }}>
      {nextSets.map(
        ({
          exerciseId,
          successful,
          nextWorkingSets,
          nextWorkingSetsReps,
          nextWorkingSetsWeight,
          workedOutAt,
        }) => {
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
              {nextWorkingSets}x{nextWorkingSetsReps}x{nextWorkingSetsWeight}
              kg{" "}
              <small>
                <small>
                  Last set{" "}
                  {formatDistanceStrict(
                    workedOutAt,
                    startOfDay(TZDate.tz(DEFAULT_TIMEZONE)),
                    { addSuffix: true, roundingMethod: "floor" },
                  )}{" "}
                </small>
              </small>
            </li>
          );
        },
      )}
    </ol>
  );
}
