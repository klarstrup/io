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
import { createTrend, getLimits, uniqueBy } from "../../../../utils";
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

  const limits = getLimits([
    ...top10sendGradeData.map((data) => data.x.valueOf()),
    ...top10flashGradeData.map((data) => data.x.valueOf()),
    ...top10attemptGradeData.map((data) => data.x.valueOf()),
  ]);
  const top10sendGradeTrend = createTrend(top10sendGradeData);
  const top10sendGradeDataTrend = limits.map((x) => ({
    x: new Date(x),
    y: top10sendGradeTrend.calcY(x),
  }));
  const top10flashGradeTrend = createTrend(top10flashGradeData);
  const top10flashGradeDataTrend = limits.map((x) => ({
    x: new Date(x),
    y: top10flashGradeTrend.calcY(x),
  }));
  const top10attemptGradeTrend = createTrend(top10attemptGradeData);
  const top10attemptGradeDataTrend = limits.map((x) => ({
    x: new Date(x),
    y: top10attemptGradeTrend.calcY(x),
  }));

  return (
    <DiaryExerciseGraph
      data={[
        { id: "Top 10 Send Grade", data: top10sendGradeData },
        { id: "Top 10 Send Grade Trend", data: top10sendGradeDataTrend },
        { id: "Top 10 Flash Grade", data: top10flashGradeData },
        { id: "Top 10 Flash Grade Trend", data: top10flashGradeDataTrend },
        { id: "Top 10 Attempt Grade", data: top10attemptGradeData },
        { id: "Top 10 Attempt Grade Trend", data: top10attemptGradeDataTrend },
      ]}
    />
  );
}
