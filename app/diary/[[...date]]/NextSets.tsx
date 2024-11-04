import { TZDate } from "@date-fns/tz";
import { formatDistanceStrict, startOfDay } from "date-fns";
import { Session } from "next-auth";
import { StealthButton } from "../../../components/StealthButton";
import { exercises } from "../../../models/exercises";
import type { getNextSets } from "../../../models/workout.server";
import { DEFAULT_TIMEZONE } from "../../../utils";

export function NextSets({
  user,
  date,
  nextSets,
  onAddExercise,
}: {
  user: Session["user"];
  date: `${number}-${number}-${number}`;
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
  onAddExercise?: (exerciseId: number) => void;
}) {
  const tzDate = new TZDate(date, user.timeZone || DEFAULT_TIMEZONE);
  return (
    <ol className="flex flex-col gap-1">
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
            <li key={exercise.id} className="flex items-start">
              {onAddExercise ? (
                <StealthButton onClick={() => onAddExercise(exercise.id)}>
                  ➕
                </StealthButton>
              ) : null}
              <div className="leading-none">
                <span className="whitespace-nowrap font-semibold">
                  {
                    [exercise.name, ...exercise.aliases]
                      .filter((name) => name.length >= 4)
                      .sort((a, b) => a.length - b.length)[0]!
                  }{" "}
                  {successful ? null : " (failed)"}
                </span>{" "}
                <div className="whitespace-nowrap">
                  <span className="text-sm">
                    {nextWorkingSets}x{nextWorkingSetsReps}x
                    {nextWorkingSetsWeight}
                    kg
                  </span>{" "}
                  <span className="text-xs">
                    Last set{" "}
                    {formatDistanceStrict(workedOutAt, startOfDay(tzDate), {
                      addSuffix: true,
                      roundingMethod: "floor",
                    })}{" "}
                  </span>
                </div>
              </div>
            </li>
          );
        },
      )}
    </ol>
  );
}
