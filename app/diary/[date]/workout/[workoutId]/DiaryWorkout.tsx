import { TZDate } from "@date-fns/tz";
import { ObjectId } from "mongodb";
import { auth } from "../../../../../auth";
import {
  getAllWorkoutExercises,
  getAllWorkoutLocations,
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

  if (!user) return null;

  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const isToday = date === dateToString(TZDate.tz(timeZone));

  const [workout, locations, exercisesStats] = await Promise.all([
    Workouts.findOne({ _id: new ObjectId(workoutId) }),
    getAllWorkoutLocations(user),
    getAllWorkoutExercises(user),
  ]);

  if (!workout) return null;

  const dismissTo = isToday ? "/diary" : (`/diary/${date}` as const);

  return (
    <WorkoutForm
      key={workout._id.toString() + workout.updatedAt.toString()}
      date={date}
      user={user}
      workout={{
        ...workout,
        id: workout._id.toString(),
        _id: workout._id.toString(),
      }}
      locations={locations}
      exercisesStats={exercisesStats}
      dismissTo={dismissTo}
    />
  );
}
