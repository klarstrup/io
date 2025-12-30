"use client";
import { tz, TZDate } from "@date-fns/tz";
import { addMilliseconds, formatDistanceStrict, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import Link from "next/link";
import { useEffect } from "react";
import { StealthButton } from "../../components/StealthButton";
import { exercisesById } from "../../models/exercises";
import { durationToMs } from "../../models/workout";
import type { getNextSets } from "../../models/workout.server";
import { DEFAULT_TIMEZONE } from "../../utils";
import { WorkoutEntryExerciseSetRow } from "./WorkoutEntryExerciseSetRow";

export function NextSets({
  user,
  date,
  nextSets,
  onAddExerciseAction,
  onSnoozeDueSetAction,
  showDetails = true,
  showDueDate = false,
}: {
  user?: Session["user"];
  date: `${number}-${number}-${number}`;
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
  onAddExerciseAction?: (
    dueSet: Awaited<ReturnType<typeof getNextSets>>[number],
  ) => void;
  onSnoozeDueSetAction?: (
    dueSet: Awaited<ReturnType<typeof getNextSets>>[number],
  ) => void;
  showDetails?: boolean;
  showDueDate?: boolean;
}) {
  const tzDate = new TZDate(date, user?.timeZone || DEFAULT_TIMEZONE);

  useEffect(() => {
    const queryScheduleEntryId = new URLSearchParams(
      window.location.search,
    ).get("scheduleEntryId");
    if (queryScheduleEntryId) {
      const dueSet = nextSets.find(
        (ds) => ds.scheduleEntry.id === queryScheduleEntryId,
      );
      if (dueSet && onAddExerciseAction) {
        onAddExerciseAction(dueSet);

        // Remove the query param from the URL
        const url = new URL(window.location.href);
        url.searchParams.delete("scheduleEntryId");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [nextSets, onAddExerciseAction]);

  return (
    <ol
      className={
        "flex gap-1 " + (showDetails ? "flex-col" : "flex-row flex-wrap")
      }
    >
      {nextSets.map((dueSet, i) => {
        const {
          exerciseId,
          successful,
          scheduleEntry,
          nextWorkingSets,
          nextWorkingSetInputs,
          workedOutAt,
        } = dueSet;
        const exercise = exercisesById[exerciseId]!;

        return (
          <li
            key={JSON.stringify(scheduleEntry)}
            className="flex items-start gap-2"
          >
            <div className="flex flex-col leading-tight">
              {onAddExerciseAction ? (
                <StealthButton onClick={() => onAddExerciseAction(dueSet)}>
                  ➕
                </StealthButton>
              ) : null}
              {onSnoozeDueSetAction ? (
                <StealthButton onClick={() => onSnoozeDueSetAction(dueSet)}>
                  💤
                </StealthButton>
              ) : null}
            </div>
            <div className="leading-tight">
              <Link
                prefetch={false}
                href={`/diary/exercises/${exercise.id}`}
                style={{ color: "#edab00" }}
                className="font-semibold whitespace-nowrap"
              >
                {
                  [exercise.name, ...exercise.aliases]
                    .filter((name) => name.length >= 4)
                    .sort((a, b) => a.length - b.length)[0]!
                }
              </Link>
              {showDetails &&
              (nextWorkingSetInputs?.length || nextWorkingSets) ? (
                <>
                  {" "}
                  <table className="inline-table w-auto max-w-0 align-baseline text-sm">
                    <tbody>
                      <WorkoutEntryExerciseSetRow
                        exercise={exercise}
                        set={{ inputs: nextWorkingSetInputs ?? [] }}
                        repeatCount={nextWorkingSets}
                      />
                    </tbody>
                  </table>
                </>
              ) : null}
              {showDetails ? (
                <div className="align-baseline whitespace-nowrap">
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
                    )}
                    {successful === false ? " (failed)" : null}
                  </span>
                  {showDueDate && scheduleEntry?.frequency && workedOutAt ? (
                    <span className="text-xs">
                      , due{" "}
                      {formatDistanceStrict(
                        addMilliseconds(
                          workedOutAt,
                          durationToMs(scheduleEntry.frequency),
                        ),
                        date,
                        {
                          addSuffix: true,
                          roundingMethod: "floor",
                          unit: "day",
                        },
                      )}
                    </span>
                  ) : null}
                </div>
              ) : i < nextSets.length - 1 ? (
                ","
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
