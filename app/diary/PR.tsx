import { useEffect, useState } from "react";
import { WorkoutData, WorkoutExerciseSet } from "../../models/workout";
import { getIsSetPR } from "./actions";

export function PR(props: {
  workout: WorkoutData;
  exerciseId: WorkoutData["exercises"][number]["exerciseId"];
  set: WorkoutExerciseSet;
}) {
  const [prResponse, setPrResponse] = useState<
    | {
        isAllTimePR: boolean;
        isYearPR: boolean;
        is3MonthPR: boolean;
      }
    | undefined
  >({
    isAllTimePR: false,
    isYearPR: false,
    is3MonthPR: false,
  });

  useEffect(() => {
    void getIsSetPR(props.workout, props.exerciseId, props.set).then((res) => {
      setPrResponse(res);
    });
  }, [props.workout, props.exerciseId, props.set]);

  return prResponse?.is3MonthPR ||
    prResponse?.isYearPR ||
    prResponse?.isAllTimePR ? (
    <sup className="text-[10px] font-bold">
      {prResponse.isAllTimePR
        ? "AtPR"
        : prResponse.isYearPR
          ? "1yPR"
          : prResponse.is3MonthPR
            ? "3mPR"
            : null}
    </sup>
  ) : null;
}
