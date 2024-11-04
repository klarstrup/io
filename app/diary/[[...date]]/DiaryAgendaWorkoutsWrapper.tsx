import { TZDate } from "@date-fns/tz";
import { endOfDay, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import { getNextSets, Workouts } from "../../../models/workout.server";
import { workoutFromFitocracyWorkout } from "../../../sources/fitocracy";
import { FitocracyWorkouts } from "../../../sources/fitocracy.server";
import { DEFAULT_TIMEZONE } from "../../../utils";
import { getIsSetPR } from "./actions";
import { DiaryAgendaWorkouts } from "./DiaryAgendaWorkouts";
import { getDiaryEntries } from "./getDiaryEntries";

const getAllWorkoutLocations = async (user: Session["user"]) =>
  (
    await Workouts.distinct("location", {
      userId: user.id,
      deletedAt: { $exists: false },
    })
  ).filter((loc): loc is string => Boolean(loc));

export async function DiaryAgendaWorkoutsWrapper({
  date,
  user,
}: {
  date: `${number}-${number}-${number}`;
  user: Session["user"];
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const [locations, nextSets, diaryEntries] = await Promise.all([
    getAllWorkoutLocations(user),
    getNextSets({ user, to: startOfDay(new TZDate(date, timeZone)) }),
    getDiaryEntries({
      from: startOfDay(new Date(date)),
      to: endOfDay(new Date(date)),
    }),
  ]);

  const workoutsExerciseSetPRs: Record<
    string,
    {
      isAllTimePR: boolean;
      isYearPR: boolean;
      is3MonthPR: boolean;
    }[][]
  > = {};

  for (const workout of diaryEntries[0]?.[1]?.workouts ?? []) {
    if (!workoutsExerciseSetPRs[workout._id]) {
      workoutsExerciseSetPRs[workout._id] = [];
    }

    for (const exercise of workout.exercises) {
      const ioWorkouts = await Workouts.find({
        userId: user.id,
        "exercises.exerciseId": exercise.exerciseId,
        workedOutAt: { $lt: workout.workedOutAt },
      }).toArray();

      const fitocracyWorkouts = user.fitocracyUserId
        ? (
            await FitocracyWorkouts.find({
              user_id: user.fitocracyUserId,
              "root_group.children.exercise.exercise_id": exercise.exerciseId,
              workout_timestamp: { $lt: workout.workedOutAt },
            }).toArray()
          ).map((w) => workoutFromFitocracyWorkout(w))
        : [];

      const precedingWorkouts = [...ioWorkouts, ...fitocracyWorkouts];

      const exerciseSetsPRs: {
        isAllTimePR: boolean;
        isYearPR: boolean;
        is3MonthPR: boolean;
      }[] = [];
      for (const set of exercise.sets) {
        exerciseSetsPRs.push(
          await getIsSetPR(precedingWorkouts, exercise.exerciseId, set),
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
      locations={locations}
      nextSets={nextSets}
    />
  );
}
