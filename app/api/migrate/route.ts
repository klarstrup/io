import { getDB } from "../../../dbConnect";
import { WorkoutData } from "../../../models/workout";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  //  const user = (await auth())?.user;
  //  if (!user) return new Response("Unauthorized", { status: 401 });

  const DB = await getDB();

  const workoutsCollection = DB.collection<WorkoutData>("workouts");

  if (
    !(await workoutsCollection.countDocuments({
      "exercises.exercise_id": { $exists: true },
    }))
  ) {
    return new Response("No documents to update");
  }

  console.log(
    await workoutsCollection.updateMany(
      {},
      {
        $rename: {
          worked_out_at: "workedOutAt",
          user_id: "userId",
          deleted_at: "deletedAt",
          created_at: "createdAt",
          updated_at: "updatedAt",
        },
      },
    ),
  );

  console.log(
    await workoutsCollection.updateMany({}, [
      {
        $set: {
          exercises: {
            $map: {
              input: "$exercises",
              as: "exercise",
              in: {
                exerciseId: "$$exercise.exercise_id",
                sets: {
                  $map: {
                    input: "$$exercise.sets",
                    as: "set",
                    in: {
                      inputs: {
                        $map: {
                          input: "$$set.inputs",
                          as: "input",
                          in: {
                            unit: "$$input.unit",
                            value: "$$input.value",
                            assistType: "$$input.assist_type",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ]),
  );

  return new Response("Hello, world!");
}
