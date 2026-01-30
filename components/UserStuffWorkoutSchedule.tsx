import { auth } from "../auth";
import { getAllWorkoutExercises } from "../models/workout.server";
import UserStuffWorkoutScheduleForm from "./UserStuffWorkoutScheduleForm";

export default async function UserStuffWorkoutSchedule() {
  const user = (await auth())?.user;

  if (!user) return null;

  return (
    <UserStuffWorkoutScheduleForm
      exercisesStats={await getAllWorkoutExercises(user)}
      user={user}
    />
  );
}
