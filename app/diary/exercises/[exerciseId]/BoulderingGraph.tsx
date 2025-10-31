import { endOfDay, endOfWeek, min } from "date-fns";
import { ObjectId } from "mongodb";
import { Locations } from "../../../../models/location.server";
import { WorkoutExercise, WorkoutSource } from "../../../../models/workout";
import {
  calculate60dayTop10AverageAttemptGrade,
  calculate60dayTop10AverageFlashGrade,
  calculate60dayTop10AverageSendGrade,
} from "../../../../models/workout.server";
import { createTrend, getLimits, uniqueBy } from "../../../../utils";
import DiaryExerciseGraph from "./DiaryExerciseGraph";

const filterNullData = <T,>(data: { x: Date; y: T | null }[]) =>
  data.filter((d): d is { x: Date; y: T } => d.y !== null);

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

  const locations = await Locations.find({ userId }).toArray();

  const [top10sendGradeData, top10flashGradeData, top10attemptGradeData] =
    await Promise.all([
      Promise.all(
        uniqueWorkedOutAts.map(async (workedOutAt) => {
          const x = min([endOfDay(workedOutAt), new Date()]);
          return {
            x,
            y: await calculate60dayTop10AverageSendGrade(locations, userId, x),
          };
        }),
      ).then(filterNullData),
      Promise.all(
        uniqueWorkedOutAts.map(async (workedOutAt) => {
          const x = min([endOfDay(workedOutAt), new Date()]);
          return {
            x,
            y: await calculate60dayTop10AverageFlashGrade(locations, userId, x),
          };
        }),
      ).then(filterNullData),
      Promise.all(
        uniqueWorkedOutAts.map(async (workedOutAt) => {
          const x = min([endOfDay(workedOutAt), new Date()]);
          return {
            x,
            y: await calculate60dayTop10AverageAttemptGrade(
              locations,
              userId,
              x,
            ),
          };
        }),
      ).then(filterNullData),
    ]);

  const top10sendGradeDataTrend = (() => {
    const trend = createTrend(top10sendGradeData);
    return getLimits(top10sendGradeData.map((data) => data.x.valueOf())).map(
      (x) => ({ x: new Date(x), y: trend.calcY(x) }),
    );
  })();
  const top10flashGradeDataTrend = (() => {
    const trend = createTrend(top10flashGradeData);
    return getLimits(top10flashGradeData.map((data) => data.x.valueOf())).map(
      (x) => ({ x: new Date(x), y: trend.calcY(x) }),
    );
  })();
  const top10attemptGradeDataTrend = (() => {
    const trend = createTrend(top10attemptGradeData);
    return getLimits(top10attemptGradeData.map((data) => data.x.valueOf())).map(
      (x) => ({ x: new Date(x), y: trend.calcY(x) }),
    );
  })();

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
