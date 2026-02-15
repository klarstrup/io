import { auth } from "../auth";
import { getAllWorkoutExercises } from "../models/workout.server";
import UserStuffWorkoutSchedulesForm from "./UserStuffWorkoutScheduleForm";

export default async function UserStuffWorkoutSchedule() {
  const user = (await auth())?.user;

  if (!user) return null;

  return (
    <UserStuffWorkoutSchedulesForm
      exercisesStats={await getAllWorkoutExercises(user)}
      user={user}
    />
  );
}
