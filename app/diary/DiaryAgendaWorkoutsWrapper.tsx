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
import { DEFAULT_TIMEZONE, rangeToQuery } from "../../utils";
import { DiaryAgendaWorkouts } from "./DiaryAgendaWorkouts";

export async function DiaryAgendaWorkoutsWrapper({
  date,
  user,
}: {
  date: `${number}-${number}-${number}`;
  user: Session["user"];
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const tzDate = new TZDate(date, timeZone);
  const [nextSets, workouts] = await Promise.all([
    getNextSets({ user, to: endOfDay(tzDate) }),
    getAllWorkouts({
      user,
      workedOutAt: rangeToQuery(startOfDay(tzDate), endOfDay(tzDate)),
    }),
  ]);

  const workoutsExerciseSetPRs: Record<string, Record<PRType, boolean>[][]> =
    {};

  for (const workout of workouts ?? []) {
    const workoutId = workout._id.toString();
    if (!workoutsExerciseSetPRs[workoutId]) {
      workoutsExerciseSetPRs[workoutId] = [];
    }

    for (const exercise of workout.exercises) {
      if (exercise.exerciseId === 2001) {
        workoutsExerciseSetPRs[workoutId].push(
          Array.from({ length: exercise.sets.length }, () => noPR),
        );
        continue;
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
      workoutsExerciseSetPRs[workoutId].push(exerciseSetsPRs);
    }
  }

  return (
    <DiaryAgendaWorkouts
      date={date}
      workoutsExerciseSetPRs={workoutsExerciseSetPRs}
      workouts={workouts}
      user={user}
      nextSets={nextSets}
    />
  );
}
