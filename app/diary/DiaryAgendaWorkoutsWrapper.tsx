import { TZDate } from "@date-fns/tz";
import { endOfDay, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import { isClimbingExercise } from "../../models/workout";
import {
  getIsSetPR,
  getNextSets,
  MaterializedWorkoutsView,
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
    MaterializedWorkoutsView.find(
      {
        userId: user.id,
        workedOutAt: rangeToQuery(startOfDay(tzDate), endOfDay(tzDate)),
        deletedAt: { $exists: false },
      },
      { sort: { workedOutAt: -1 } },
    ).toArray(),
  ]);

  const workoutsExerciseSetPRs = await Promise.all(
    workouts.map((workout) =>
      Promise.all(
        workout.exercises.map(async (exercise) => {
          if (isClimbingExercise(exercise.exerciseId)) {
            return Array.from({ length: exercise.sets.length }, () => noPR);
          }

          const precedingWorkouts = await MaterializedWorkoutsView.find(
            {
              userId: user.id,
              "exercises.exerciseId": exercise.exerciseId,
              workedOutAt: { $lt: workout.workedOutAt },
              deletedAt: { $exists: false },
            },
            { sort: { workedOutAt: -1 } },
          ).toArray();

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
