"use client";
import { TZDate } from "@date-fns/tz";
import { formatDistanceStrict } from "date-fns";
import type { Session } from "next-auth";
import Link from "next/link";
import { useEffect } from "react";
import { ExerciseName } from "../../components/ExerciseName";
import { StealthButton } from "../../components/StealthButton";
import { NextSet } from "../../graphql.generated";
import { exercisesById } from "../../models/exercises";
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
  nextSets: NextSet[];
  onAddExerciseAction?: (dueSet: NextSet) => void;
  onSnoozeDueSetAction?: (dueSet: NextSet) => void;
  showDetails?: boolean;
  showDueDate?: boolean;
}) {
  const now = TZDate.tz(user?.timeZone || DEFAULT_TIMEZONE);

  useEffect(() => {
    const queryExerciseScheduleId = new URLSearchParams(
      window.location.search,
    ).get("exerciseScheduleId");
    if (queryExerciseScheduleId) {
      const dueSet = nextSets.find(
        (ds) => ds.exerciseSchedule.id === queryExerciseScheduleId,
      );
      if (dueSet && onAddExerciseAction) {
        onAddExerciseAction(dueSet);

        // Remove the query param from the URL
        const url = new URL(window.location.href);
        url.searchParams.delete("exerciseScheduleId");
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
          exerciseSchedule,
          nextWorkingSets,
          nextWorkingSetInputs,
          workedOutAt,
        } = dueSet;
        const exercise = exercisesById.get(exerciseId)!;

        return (
          <li key={dueSet.id} className="flex items-start gap-2">
            <div className="flex flex-col leading-tight">
              {onAddExerciseAction && !exercise.is_hidden ? (
                <StealthButton onClick={() => onAddExerciseAction(dueSet)}>
                  ➕
                </StealthButton>
              ) : null}
              {onSnoozeDueSetAction && !exercise.is_hidden ? (
                <StealthButton onClick={() => onSnoozeDueSetAction(dueSet)}>
                  💤
                </StealthButton>
              ) : null}
              {exercise.is_hidden ? (
                <span
                  title="This exercise is hidden and won't appear in suggestions."
                  className="opacity-0 select-none"
                >
                  🙈
                </span>
              ) : null}
            </div>
            <div className="leading-tight">
              <Link
                prefetch={false}
                href={`/diary/exercises/${exercise.id}`}
                style={{ color: "#edab00" }}
                className="font-semibold whitespace-nowrap"
              >
                <ExerciseName exerciseInfo={exercise} />
              </Link>
              {showDetails &&
              (nextWorkingSetInputs?.length || nextWorkingSets) ? (
                <>
                  {" "}
                  <table className="inline-table w-auto max-w-0 align-baseline text-sm">
                    <tbody>
                      <WorkoutEntryExerciseSetRow
                        exercise={exercise}
                        set={{
                          __typename: "WorkoutSet",
                          inputs: nextWorkingSetInputs ?? [],
                        }}
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
                        href={`/diary/${new Date(workedOutAt).toISOString().slice(0, 10)}`}
                        style={{ color: "#edab00" }}
                      >
                        {formatDistanceStrict(workedOutAt, now, {
                          addSuffix: true,
                        })}
                      </Link>
                    ) : (
                      "never"
                    )}
                    {successful === false ? " (failed)" : null}
                  </span>
                  {showDueDate && exerciseSchedule?.frequency && workedOutAt ? (
                    <span className="text-xs">
                      , due{" "}
                      {formatDistanceStrict(dueSet.dueOn, now, {
                        addSuffix: true,
                        roundingMethod: "floor",
                      })}
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
