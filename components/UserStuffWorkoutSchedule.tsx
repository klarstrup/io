import { auth } from "../auth";
import { getAllWorkoutExercises } from "../models/workout.server";
import { UserStuffWorkoutScheduleFormLoader } from "./UserStuffWorkoutScheduleFormLoader";

export default async function UserStuffWorkoutSchedule() {
  const user = (await auth())?.user;

  if (!user) return null;

  return (
    <UserStuffWorkoutScheduleFormLoader
      exercisesStats={await getAllWorkoutExercises(user)}
      user={user}
    />
  );
}
