import { TZDate } from "@date-fns/tz";
import { endOfDay, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import { PRType } from "../../lib";
import {
  getAllWorkouts,
  getIsSetPR,
  getNextSets,
  noPR,
} from "../../models/workout.server";
import { DEFAULT_TIMEZONE } from "../../utils";
import { DiaryAgendaWorkouts } from "./DiaryAgendaWorkouts";
import { getDiaryEntries } from "./getDiaryEntries";

export async function DiaryAgendaWorkoutsWrapper({
  date,
  user,
}: {
  date: `${number}-${number}-${number}`;
  user: Session["user"];
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const tzDate = new TZDate(date, timeZone);
  const [nextSets, diaryEntries] = await Promise.all([
    getNextSets({ user, to: endOfDay(tzDate) }),
    getDiaryEntries({ from: startOfDay(tzDate), to: endOfDay(tzDate) }),
  ]);

  const workoutsExerciseSetPRs: Record<string, Record<PRType, boolean>[][]> =
    {};

  for (const workout of diaryEntries[0]?.[1]?.workouts ?? []) {
    if (!workoutsExerciseSetPRs[workout._id]) {
      workoutsExerciseSetPRs[workout._id] = [];
    }

    for (const exercise of workout.exercises) {
      if (exercise.exerciseId === 2001) {
        workoutsExerciseSetPRs[workout._id]!.push(
          Array.from({ length: exercise.sets.length }, () => noPR),
        );
      }

      const precedingWorkouts = await getAllWorkouts({
        user,
        exerciseId: exercise.exerciseId,
        workedOutAt: { $lt: workout.workedOutAt },
      });

      const exerciseSetsPRs: Record<PRType, boolean>[] = [];
      for (const set of exercise.sets) {
        exerciseSetsPRs.push(
          getIsSetPR(
            workout.workedOutAt,
            workout,
            precedingWorkouts,
            exercise.exerciseId,
            set,
          ),
        );
      }
      workoutsExerciseSetPRs[workout._id]!.push(exerciseSetsPRs);
    }
  }

  return (
    <DiaryAgendaWorkouts
      date={date}
      workoutsExerciseSetPRs={workoutsExerciseSetPRs}
      workouts={diaryEntries[0]?.[1]?.workouts}
      user={user}
      nextSets={nextSets}
    />
  );
}
