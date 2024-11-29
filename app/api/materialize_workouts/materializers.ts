import {
  addMonths,
  eachMonthOfInterval,
  endOfMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { ObjectId, UpdateResult, WithId } from "mongodb";
import type { Session } from "next-auth";
import { getDB } from "../../../dbConnect";
import { Unit } from "../../../models/exercises";
import { WorkoutData, WorkoutSource } from "../../../models/workout";
import { MaterializedWorkoutsView } from "../../../models/workout.server";
import { Fitocracy } from "../../../sources/fitocracy";
import {
  type KilterBoard,
  KilterBoardAscents,
  workoutFromKilterBoardAscents,
} from "../../../sources/kilterboard";
import { RunDouble } from "../../../sources/rundouble";
import { dateToString, shuffle } from "../../../utils";
import {
  dereferenceDocument,
  TopLoggerGraphQL,
  workoutFromTopLoggerClimbUsers,
} from "../../../utils/graphql";
import type {
  TopLoggerClimbUser,
  TopLoggerClimbUserDereferenced,
} from "../toplogger_gql_scrape/route";

export async function* materializeAllToploggerWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  if (!user.topLoggerGraphQLId) return;

  for (const month of [
    ...eachMonthOfInterval({
      start: subMonths(startOfMonth(new Date()), 1),
      end: addMonths(endOfMonth(new Date()), 0),
    }).reverse(),
    ...shuffle(
      eachMonthOfInterval({
        start: new Date("2021-01-01"),
        end: subMonths(endOfMonth(new Date()), 2),
      }),
    ),
  ]) {
    yield month;
    const climbUsers = await TopLoggerGraphQL.find<WithId<TopLoggerClimbUser>>({
      __typename: "ClimbUser",
      userId: user.topLoggerGraphQLId,
      tickedFirstAtDate: {
        $gte: startOfMonth(month),
        $lt: endOfMonth(month),
      },
    }).toArray();

    const dereferencedClimbUsers = await Promise.all(
      climbUsers.map((climbUser) =>
        dereferenceDocument<
          WithId<TopLoggerClimbUser>,
          WithId<TopLoggerClimbUserDereferenced>
        >(climbUser),
      ),
    );

    const climbUsersByDay = Object.values(
      dereferencedClimbUsers.reduce(
        (acc, climbUser) => {
          if (!climbUser.tickedFirstAtDate) return acc;
          const date = dateToString(climbUser.tickedFirstAtDate);

          if (!Array.isArray(acc[date])) {
            acc[date] = [climbUser];
          } else {
            acc[date].push(climbUser);
          }

          return acc;
        },
        {} as Record<
          `${number}-${number}-${number}`,
          WithId<TopLoggerClimbUserDereferenced>[]
        >,
      ),
    );

    for (const climbUsersOfDay of climbUsersByDay) {
      const workout = workoutFromTopLoggerClimbUsers(user, climbUsersOfDay);
      console.log(workout);
      yield await MaterializedWorkoutsView.updateOne(
        { id: workout.id },
        { $set: workout },
        { upsert: true },
      );
    }
  }
}

export async function* materializeAllIoWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  yield "materializeAllIoWorkouts: start";
  const t = new Date();
  const db = await getDB();

  yield await db
    .collection<WorkoutData>("workouts")
    .aggregate([
      { $match: { userId: user.id, deletedAt: { $exists: false } } },
      {
        $addFields: {
          id: { $toString: "$_id" },
          _id: "$$REMOVE",
        },
      },
      {
        $merge: {
          into: "materialized_workouts_view",
          whenMatched: "replace",
          on: "id",
        },
      },
    ])
    .toArray();

  yield "materializeAllIoWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeAllFitocracyWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  if (!user.fitocracyUserId) return;

  yield "materializeAllFitocracyWorkouts: start";
  const t = new Date();
  const db = await getDB();

  yield await db
    .collection<Fitocracy.MongoWorkout>("fitocracy_workouts")
    .aggregate([
      { $match: { user_id: user.fitocracyUserId } },
      {
        $project: {
          _id: 0,
          id: { $toString: "$id" },
          userId: { $literal: user.id },
          createdAt: "$updated_timestamp",
          updatedAt: "$updated_timestamp",
          workedOutAt: "$workout_timestamp",
          source: { $literal: WorkoutSource.Fitocracy },
          exercises: {
            $map: {
              input: "$root_group.children",
              as: "child",
              in: {
                exerciseId: "$$child.exercise.exercise_id",
                sets: {
                  $map: {
                    input: "$$child.exercise.sets",
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
      {
        $merge: {
          into: "materialized_workouts_view",
          whenMatched: "replace",
          on: "id",
        },
      },
    ])
    .toArray();

  yield "materializeAllFitocracyWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeAllRunDoubleWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  if (!user.runDoubleId) return;

  yield "materializeAllRunDoubleWorkouts: start";
  const t = new Date();
  const db = await getDB();

  yield await db
    .collection<RunDouble.MongoHistoryItem>("rundouble_runs")
    .aggregate([
      { $match: { userId: user.runDoubleId } },
      {
        $project: {
          _id: 0,
          id: { $toString: "$key" },
          userId: { $literal: user.id },
          createdAt: "$completedAt",
          updatedAt: "$completedAt",
          workedOutAt: "$completedAt",
          source: { $literal: WorkoutSource.RunDouble },
          exercises: [
            {
              exerciseId: 518,
              sets: [
                {
                  inputs: [
                    {
                      unit: Unit.SEC,
                      value: { $divide: ["$runTime", 1000] },
                    },
                    { unit: Unit.M, value: "$runDistance" },
                    {
                      unit: Unit.MinKM,
                      value: { $divide: [0.6215, "$runPace"] },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        $merge: {
          into: "materialized_workouts_view",
          whenMatched: "replace",
          on: "id",
        },
      },
    ])
    .toArray();

  yield "materializeAllRunDoubleWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeAllKilterBoardWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  yield "materializeAllKilterBoardWorkouts: start";
  const t = new Date();
  const db = await getDB();

  yield await db
    .collection<KilterBoard.Ascent>("kilterboard_ascents")
    .aggregate([
      { $match: { user_id: 158721 } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$climbed_at" } },
          ascents: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: 0,
          id: {
            $concat: [
              { $literal: WorkoutSource.KilterBoard },
              ":",
              { $toString: { $arrayElemAt: ["$ascents.user_id", 0] } },
              ":",
              "$_id",
            ],
          },
          userId: { $literal: user.id },
          createdAt: { $arrayElemAt: ["$ascents.created_at", 0] },
          updatedAt: { $arrayElemAt: ["$ascents.updated_at", 0] },
          workedOutAt: { $arrayElemAt: ["$ascents.climbed_at", 0] },
          source: { $literal: WorkoutSource.KilterBoard },
          exercises: [
            {
              exerciseId: 2003,
              sets: {
                $map: {
                  input: "$ascents",
                  as: "ascent",
                  in: {
                    inputs: [
                      // Grade
                      { value: "$$ascent.grade", unit: Unit.FrenchRounded },
                      // Color
                      { value: NaN },
                      // Sent-ness
                      { value: 1 },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
      {
        $merge: {
          into: "materialized_workouts_view",
          whenMatched: "replace",
          on: "id",
        },
      },
    ])
    .toArray();

  yield "materializeAllKilterBoardWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
  return;
  const ascents = await KilterBoardAscents.find({ user_id: 158721 }).toArray();

  const ascentsByDay = Object.values(
    ascents.reduce(
      (acc, ascent) => {
        if (!ascent.climbed_at) return acc;
        const date = dateToString(ascent.climbed_at);

        if (!Array.isArray(acc[date])) {
          acc[date] = [ascent];
        } else {
          acc[date].push(ascent);
        }

        return acc;
      },
      {} as Record<
        `${number}-${number}-${number}`,
        WithId<KilterBoard.Ascent>[]
      >,
    ),
  );

  for (const ascentsOfDay of ascentsByDay) {
    const workout = workoutFromKilterBoardAscents(user, ascentsOfDay);

    yield await MaterializedWorkoutsView.updateOne(
      { id: workout.id },
      { $set: workout },
      { upsert: true },
    );
  }
}

export class UpdateResultKeeper {
  matchedCount = 0;
  modifiedCount = 0;
  upsertedCount = 0;
  upsertedIds: ObjectId[] = [];

  addUpdateResult(updateResult: UpdateResult) {
    this.matchedCount += updateResult.matchedCount;
    this.modifiedCount += updateResult.modifiedCount;
    this.upsertedCount += updateResult.upsertedCount;
    if (updateResult.upsertedId) {
      this.upsertedIds.push(updateResult.upsertedId);
    }
  }
  toJSON() {
    return {
      matchedCount: this.matchedCount,
      modifiedCount: this.modifiedCount,
      upsertedCount: this.upsertedCount,
      upsertedIds: this.upsertedIds,
    };
  }
}
