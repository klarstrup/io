import { tz, TZDate } from "@date-fns/tz";
import { formatDistanceStrict, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import Link from "next/link";
import { StealthButton } from "../../components/StealthButton";
import { exercisesById } from "../../models/exercises";
import type { getNextSets } from "../../models/workout.server";
import { DEFAULT_TIMEZONE } from "../../utils";
import { WorkoutEntryExerciseSetRow } from "./WorkoutEntryExerciseSetRow";

export function NextSets({
  user,
  date,
  nextSets,
  onAddExercise,
  showDetails = true,
}: {
  user?: Session["user"];
  date: `${number}-${number}-${number}`;
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
  onAddExercise?: (exerciseId: number) => void;
  showDetails?: boolean;
}) {
  const tzDate = new TZDate(date, user?.timeZone || DEFAULT_TIMEZONE);
  return (
    <ol
      className={
        "flex gap-1 " + (showDetails ? "flex-col" : "flex-row flex-wrap")
      }
    >
      {nextSets.map(
        (
          {
            exerciseId,
            successful,
            scheduleEntry,
            nextWorkingSets,
            nextWorkingSetInputs,
            workedOutAt,
          },
          i,
        ) => {
          const exercise = exercisesById[exerciseId]!;

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
                  </Link>
                </span>
                {showDetails ? (
                  <div className="align-baseline whitespace-nowrap">
                    {nextWorkingSets ? (
                      <table className="inline-table w-auto max-w-0 align-baseline text-sm">
                        <tbody>
                          <WorkoutEntryExerciseSetRow
                            exercise={exercise}
                            set={{ inputs: nextWorkingSetInputs }}
                            repeatCount={nextWorkingSets}
                          />
                        </tbody>
                      </table>
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
                              in: tz(user?.timeZone || DEFAULT_TIMEZONE),
                            }),
                            startOfDay(tzDate),
                            { addSuffix: true, roundingMethod: "floor" },
                          )}
                        </Link>
                      ) : (
                        "never"
                      )}{" "}
                      {successful === false ? " (failed)" : null}
                    </span>
                  </div>
                ) : i < nextSets.length - 1 ? (
                  ","
                ) : null}
              </div>
            </li>
          );
        },
      )}
    </ol>
  );
}
