import { endOfDay, endOfWeek, min } from "date-fns";
import { ObjectId } from "mongodb";
import { Locations } from "../../../../models/location.server";
import { WorkoutExercise, WorkoutSource } from "../../../../models/workout";
import {
  calculate60dayTop10AverageAttemptGrade,
  calculate60dayTop10AverageFlashGrade,
  calculate60dayTop10AverageSendGrade,
  MaterializedWorkoutsView,
} from "../../../../models/workout.server";
import { getTrendLine, uniqueBy } from "../../../../utils";
import DiaryExerciseGraph from "./DiaryExerciseGraph";

const roundDataToWeeks = false;
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
  const uniqueWorkedOutAts = uniqueBy(
    allWorkoutsOfExercise.map((w) =>
      roundDataToWeeks
        ? min([endOfWeek(w.workedOutAt), new Date()])
        : w.workedOutAt,
    ),
    (workedOutAt) => workedOutAt.toISOString(),
  );

  const [locations, workouts] = await Promise.all([
    Locations.find({ userId }).toArray(),
    MaterializedWorkoutsView.find({
      userId,
      "exercises.exerciseId": 2001,
      deletedAt: { $exists: false },
    }).toArray(),
  ]);

  const top10sendGradeData: { x: Date; y: number }[] = [];
  const top10flashGradeData: { x: Date; y: number }[] = [];
  const top10attemptGradeData: { x: Date; y: number }[] = [];
  for (const workedOutAt of uniqueWorkedOutAts) {
    const x = endOfDay(workedOutAt);

    const sendGrade = calculate60dayTop10AverageSendGrade(
      workouts,
      locations,
      x,
    );
    if (sendGrade) top10sendGradeData.push({ x, y: sendGrade });

    const flashGrade = calculate60dayTop10AverageFlashGrade(
      workouts,
      locations,
      x,
    );
    if (flashGrade) top10flashGradeData.push({ x, y: flashGrade });

    const attemptGrade = calculate60dayTop10AverageAttemptGrade(
      workouts,
      locations,
      x,
    );
    if (attemptGrade) top10attemptGradeData.push({ x, y: attemptGrade });
  }

  const top10sendGradeTrend = getTrendLine(top10sendGradeData);
  const top10flashGradeTrend = getTrendLine(top10flashGradeData);
  const top10attemptGradeTrend = getTrendLine(top10attemptGradeData);

  return (
    <DiaryExerciseGraph
      data={[
        { id: "Top 10 Send Grade", data: top10sendGradeData },
        { id: "Top 10 Send Grade Trend", data: top10sendGradeTrend },
        { id: "Top 10 Flash Grade", data: top10flashGradeData },
        { id: "Top 10 Flash Grade Trend", data: top10flashGradeTrend },
        { id: "Top 10 Attempt Grade", data: top10attemptGradeData },
        { id: "Top 10 Attempt Grade Trend", data: top10attemptGradeTrend },
      ]}
    />
  );
}
