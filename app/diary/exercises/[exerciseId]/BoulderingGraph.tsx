import { endOfDay, min } from "date-fns";
import { ObjectId } from "mongodb";
import { WorkoutExercise, WorkoutSource } from "../../../../models/workout";
import {
  calculate60dayTop10AverageAttemptGrade,
  calculate60dayTop10AverageFlashGrade,
  calculate60dayTop10AverageSendGrade,
  calculateFlashGradeOn,
} from "../../../../models/workout.server";
import { allPromises } from "../../../../utils";
import DiaryExerciseGraph from "./DiaryExerciseGraph";

export default async function BoulderingGraph({
  userId,
  allWorkoutsOfExercise,
}: {
  userId: string;
  allWorkoutsOfExercise: {
    exercises: WorkoutExercise[];
    userId: string;
    id: string;
    workedOutAt: Date;
    source?: WorkoutSource | undefined;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | undefined;
    location?: string | undefined;
    locationId?: string | undefined;
    materializedAt?: Date | undefined;
    _id: ObjectId;
  }[];
}) {
  return (
    <DiaryExerciseGraph
      data={await allPromises(
        async () => ({
          id: "95% Flash Grade",
          data: await Promise.all(
            allWorkoutsOfExercise.map(async ({ workedOutAt }) => ({
              x: min([endOfDay(workedOutAt), new Date()]),
              y: await calculateFlashGradeOn(
                userId,
                min([endOfDay(workedOutAt), new Date()]),
              ),
            })),
          ),
        }),
        async () => ({
          id: "Top 10 Send Grade",
          data: await Promise.all(
            allWorkoutsOfExercise.map(async ({ workedOutAt }) => ({
              x: min([endOfDay(workedOutAt), new Date()]),
              y: await calculate60dayTop10AverageSendGrade(
                userId,
                min([endOfDay(workedOutAt), new Date()]),
              ),
            })),
          ),
        }),
        async () => ({
          id: "Top 10 Flash Grade",
          data: await Promise.all(
            allWorkoutsOfExercise.map(async ({ workedOutAt }) => ({
              x: min([endOfDay(workedOutAt), new Date()]),
              y: await calculate60dayTop10AverageFlashGrade(
                userId,
                min([endOfDay(workedOutAt), new Date()]),
              ),
            })),
          ),
        }),
        async () => ({
          id: "Average Attempt Grade",
          data: await Promise.all(
            allWorkoutsOfExercise.map(async ({ workedOutAt }) => ({
              x: min([endOfDay(workedOutAt), new Date()]),
              y: await calculate60dayTop10AverageAttemptGrade(
                userId,
                min([endOfDay(workedOutAt), new Date()]),
              ),
            })),
          ),
        }),
      )}
    />
  );
}
