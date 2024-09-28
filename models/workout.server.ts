import type { Session } from "next-auth";
import { getDB } from "../dbConnect";
import { exerciseIdsThatICareAbout } from "../sources/fitocracy";
import { exercises, InputType } from "./exercises";
import type { WorkoutData } from "./workout";

export async function getNextSets({ user }: { user: Session["user"] }) {
  const DB = await getDB();
  const workoutsCollection = DB.collection<WorkoutData>("workouts");

  return (
    await Promise.all(
      exerciseIdsThatICareAbout.map(
        async (id) =>
          [
            id,
            await workoutsCollection.findOne(
              {
                user_id: user.id,
                "exercises.exercise_id": id,
                deleted_at: { $exists: false },
              },
              { sort: { worked_out_at: -1 } }
            ),
          ] as const
      )
    )
  )
    .map(([id, workout]) => {
      if (!workout) {
        return null;
      }

      const { worked_out_at } = workout;
      const exercise = workout.exercises.find(
        ({ exercise_id }) => exercise_id === id
      )!;
      const exerciseDefinition = exercises.find((ex) => ex.id === id)!;

      const heaviestSet = exercise.sets.reduce((acc, set) => {
        const setWeight = set.inputs.find((input) => {
          const inputDefinition = exerciseDefinition.inputs.find(
            (inputDef) => inputDef.id === input.id
          )!;

          return inputDefinition.type === InputType.Weight;
        })?.value;
        const accWeight = acc?.inputs.find((input) => {
          const inputDefinition = exerciseDefinition.inputs.find(
            (inputDef) => inputDef.id === input.id
          )!;

          return inputDefinition.type === InputType.Weight;
        })?.value;
        return setWeight && accWeight && setWeight > accWeight ? set : acc;
      }, exercise.sets[0]);

      const workingSets = exercise.sets.filter(
        (set) =>
          set.inputs.find((input) => {
            const inputDefinition = exerciseDefinition.inputs.find(
              (inputDef) => inputDef.id === input.id
            )!;

            return inputDefinition.type === InputType.Weight;
          })?.value ===
          heaviestSet?.inputs.find((input) => {
            const inputDefinition = exerciseDefinition.inputs.find(
              (inputDef) => inputDef.id === input.id
            )!;

            return inputDefinition.type === InputType.Weight;
          })?.value
      );

      let successful = true;
      if (
        workingSets.length >= 3 ||
        (exercise.exercise_id === 3 && workingSets.length >= 1)
      ) {
        if (
          workingSets.every(
            ({ inputs }) =>
              inputs.find((input) => {
                const inputDefinition = exerciseDefinition.inputs.find(
                  (inputDef) => inputDef.id === input.id
                )!;

                return inputDefinition.type === InputType.Reps;
              })!.value < 5
          )
        ) {
          successful = false;
        }
      } else {
        successful = false;
      }

      const nextWorkingSet = successful
        ? ([1, 183, 532].includes(exercise.exercise_id) ? 1.25 : 2.5) +
          (heaviestSet?.inputs.find((input) => {
            const inputDefinition = exerciseDefinition.inputs.find(
              (inputDef) => inputDef.id === input.id
            )!;

            return inputDefinition.type === InputType.Weight;
          })?.value || 0)
        : 0.9 *
          (heaviestSet?.inputs.find((input) => {
            const inputDefinition = exerciseDefinition.inputs.find(
              (inputDef) => inputDef.id === input.id
            )!;

            return inputDefinition.type === InputType.Weight;
          })?.value || 0);

      return {
        workout_timestamp: worked_out_at,
        exercise_id: exercise.exercise_id,
        successful,
        nextWorkingSet:
          String(nextWorkingSet).endsWith(".25") ||
          String(nextWorkingSet).endsWith(".75")
            ? nextWorkingSet - 0.25
            : nextWorkingSet,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => a.workout_timestamp.getTime() - b.workout_timestamp.getTime()
    );
}
