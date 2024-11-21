import { TZDate } from "@date-fns/tz";
import { endOfDay } from "date-fns";
import { ObjectId } from "mongodb";
import { auth } from "../../../../../auth";
import {
  getAllWorkoutExercises,
  getAllWorkoutLocations,
  getNextSets,
  Workouts,
} from "../../../../../models/workout.server";
import { dateToString, DEFAULT_TIMEZONE } from "../../../../../utils";
import { WorkoutForm } from "../../../WorkoutForm";

export default async function DiaryWorkout(props: {
  date: `${number}-${number}-${number}`;
  workoutId: string;
}) {
  const { date, workoutId } = props;
  const user = (await auth())?.user;
  const workout = await Workouts.findOne({ _id: new ObjectId(workoutId) });

  if (!user || !workout) return null;

  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const isToday = date === dateToString(TZDate.tz(timeZone));

  const tzDate = new TZDate(date, timeZone);
  const [locations, exercisesStats, nextSets] = await Promise.all([
    getAllWorkoutLocations(user),
    getAllWorkoutExercises(user),
    getNextSets({ user, to: endOfDay(tzDate) }),
  ]);

  const dismissTo = isToday ? "/diary" : (`/diary/${date}` as const);

  return (
    <WorkoutForm
      key={workout._id.toString() + workout.updatedAt.toString()}
      date={date}
      user={user}
      workout={{ ...workout, _id: workout._id.toString() }}
      locations={locations}
      exercisesStats={exercisesStats}
      dismissTo={dismissTo}
      nextSets={nextSets}
    />
  );
}
