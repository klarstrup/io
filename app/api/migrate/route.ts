import { ObjectId } from "mongodb";
import { Session } from "next-auth";
import { auth } from "../../../auth";
import { exercisesById } from "../../../models/exercises";
import { ITodoScheduleWithExerciseProgram } from "../../../models/user";
import { Users } from "../../../models/user.server";
import type { ExerciseSchedule } from "../../../sources/fitocracy";

export const maxDuration = 45;

export async function GET() {
  const user = (await auth())?.user;
  if (!user) return new Response("Unauthorized", { status: 401 });

  await migrateExerciseSchedulesToTodoSchedules(user.id);

  return new Response("Hello, world!");
}

async function migrateExerciseSchedulesToTodoSchedules(
  userId: Session["user"]["id"],
) {
  const user = await Users.findOne({ _id: new ObjectId(userId) });
  if (!user) throw new Error("User not found");

  if (user.todoSchedules && user.todoSchedules.length > 0) {
    console.log("User already has todo schedules, skipping migration");
    return;
  }

  const exerciseSchedules =
    (user as typeof user & { exerciseSchedules: ExerciseSchedule[] })
      .exerciseSchedules ?? [];

  const todoSchedules = exerciseSchedules.map(
    (schedule) =>
      ({
        id: schedule.id,
        name:
          exercisesById.get(schedule.exerciseId)?.name ?? "Unknown exercise",
        exerciseProgram: {
          exerciseId: schedule.exerciseId,
          increment: schedule.increment,
          workingSets: schedule.workingSets,
          workingReps: schedule.workingReps,
          deloadFactor: schedule.deloadFactor,
          baseWeight: schedule.baseWeight,
        },
        frequency: schedule.frequency,
        enabled: schedule.enabled,
        snoozedUntil: schedule.snoozedUntil,
      }) satisfies ITodoScheduleWithExerciseProgram,
  );

  await Users.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { todoSchedules } },
  );

  console.log("Migration complete");
}
