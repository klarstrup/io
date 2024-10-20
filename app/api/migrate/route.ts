import { Workouts } from "../../../models/workout.server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  //  const user = (await auth())?.user;
  //  if (!user) return new Response("Unauthorized", { status: 401 });

  if (
    !(await Workouts.countDocuments({
      "exercises.exercise_id": { $exists: true },
    }))
  ) {
    return new Response("No documents to update");
  }

  console.log(
    await Workouts.updateMany(
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
    await Workouts.updateMany({}, [
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
