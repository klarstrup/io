import { tz, TZDate } from "@date-fns/tz";
import { formatDistanceStrict, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import Link from "next/link";
import { StealthButton } from "../../components/StealthButton";
import { exercises } from "../../models/exercises";
import type { getNextSets } from "../../models/workout.server";
import { DEFAULT_TIMEZONE } from "../../utils";

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
          scheduleEntry,
          nextWorkingSets,
          nextWorkingSetsReps,
          nextWorkingSetsWeight,
          workedOutAt,
        }) => {
          const exercise = exercises.find(({ id }) => exerciseId === id)!;

          return (
            <li
              key={JSON.stringify(scheduleEntry)}
              className="flex items-start"
            >
              {onAddExercise ? (
                <StealthButton onClick={() => onAddExercise(exercise.id)}>
                  ➕
                </StealthButton>
              ) : null}
              <div className="leading-none">
                <span className="font-semibold whitespace-nowrap">
                  <Link
                    prefetch={false}
                    href={`/diary/exercises/${exercise.id}`}
                    style={{ color: "#edab00" }}
                  >
                    {
                      [exercise.name, ...exercise.aliases]
                        .filter((name) => name.length >= 4)
                        .sort((a, b) => a.length - b.length)[0]!
                    }
                  </Link>{" "}
                  {successful === false ? " (failed)" : null}
                </span>{" "}
                <div className="whitespace-nowrap">
                  {nextWorkingSets ? (
                    <span className="text-sm">
                      {nextWorkingSets}
                      {nextWorkingSetsReps ? `x${nextWorkingSetsReps}` : null}
                      {nextWorkingSetsWeight
                        ? `x${nextWorkingSetsWeight}kg`
                        : null}
                      {!nextWorkingSetsReps && !nextWorkingSetsWeight
                        ? " sets"
                        : null}
                    </span>
                  ) : null}{" "}
                  <span className="text-xs">
                    Last set{" "}
                    {workedOutAt ? (
                      <Link
                        prefetch={false}
                        href={`/diary/${workedOutAt.toISOString().slice(0, 10)}`}
                        style={{ color: "#edab00" }}
                      >
                        {formatDistanceStrict(
                          startOfDay(workedOutAt, {
                            in: tz(user.timeZone || DEFAULT_TIMEZONE),
                          }),
                          startOfDay(tzDate),
                          { addSuffix: true, roundingMethod: "floor" },
                        )}
                      </Link>
                    ) : (
                      "never"
                    )}
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
