import { TZDate } from "@date-fns/tz";
import { endOfDay, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import {
  getAllWorkouts,
  getIsSetPR,
  getNextSets,
  noPR,
} from "../../models/workout.server";
import { DEFAULT_TIMEZONE, rangeToQuery } from "../../utils";
import { DiaryAgendaWorkouts } from "./DiaryAgendaWorkouts";
import { isClimbingExercise } from "../../models/workout";

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

  const workoutsExerciseSetPRs = await Promise.all(
    workouts.map((workout) =>
      Promise.all(
        workout.exercises.map(async (exercise) => {
          if (isClimbingExercise(exercise.exerciseId)) {
            return Array.from({ length: exercise.sets.length }, () => noPR);
          }

          const precedingWorkouts = await getAllWorkouts({
            user,
            exerciseId: exercise.exerciseId,
            workedOutAt: { $lt: workout.workedOutAt },
          });

          return exercise.sets.map((set) =>
            getIsSetPR(
              workout.workedOutAt,
              workout,
              precedingWorkouts,
              exercise.exerciseId,
              set,
            ),
          );
        }),
      ),
    ),
  );

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
