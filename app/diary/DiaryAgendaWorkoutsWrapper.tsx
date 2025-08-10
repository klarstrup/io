import { TZDate } from "@date-fns/tz";
import { endOfDay, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import { Locations } from "../../models/location.server";
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
  const [nextSets, workouts, locations] = await Promise.all([
    getNextSets({ user, to: endOfDay(tzDate) }),
    MaterializedWorkoutsView.find(
      {
        userId: user.id,
        workedOutAt: rangeToQuery(startOfDay(tzDate), endOfDay(tzDate)),
        deletedAt: { $exists: false },
      },
      { sort: { workedOutAt: -1 } },
    ).toArray(),
    Locations.find({ userId: user.id }, { sort: { name: 1 } }).toArray(),
  ]);

  const workoutsExerciseSetPRs = await Promise.all(
    workouts.map((workout) =>
      Promise.all(
        workout.exercises.map(async ({ exerciseId, sets }) => {
          if (isClimbingExercise(exerciseId)) {
            return Array.from({ length: sets.length }, () => noPR);
          }

          const precedingWorkouts = await MaterializedWorkoutsView.find(
            {
              userId: user.id,
              "exercises.exerciseId": exerciseId,
              workedOutAt: { $lt: workout.workedOutAt },
              deletedAt: { $exists: false },
            },
            { sort: { workedOutAt: -1 } },
          ).toArray();

          return sets.map((set) =>
            getIsSetPR(workout, precedingWorkouts, exerciseId, set),
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
      locations={locations}
      user={user}
      nextSets={nextSets}
    />
  );
}
