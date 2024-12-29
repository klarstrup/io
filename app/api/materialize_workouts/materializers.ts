import type { Session } from "next-auth";
import { getDB } from "../../../dbConnect";
import { Unit } from "../../../models/exercises";
import { type WorkoutData, WorkoutSource } from "../../../models/workout";
import type { Fitocracy } from "../../../sources/fitocracy";
import { Grippy } from "../../../sources/grippy";
import type { KilterBoard } from "../../../sources/kilterboard";
import type { RunDouble } from "../../../sources/rundouble";
import { DataSource } from "../../../sources/utils";
import type { MongoGraphQLObject } from "../../../utils/graphql";
import { Crimpd } from "../../../sources/crimpd";

export async function* materializeAllToploggerWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  yield "materializeAllToploggerWorkouts: start";
  const t = new Date();
  const db = await getDB();

  for (const dataSource of user.dataSources || []) {
    if (dataSource.source !== DataSource.TopLogger) continue;

    const topLoggerGraphQLId = dataSource.config.graphQLId;

    yield await db
      .collection<MongoGraphQLObject>("toplogger_graphql")
      .aggregate([
        {
          $match: {
            __typename: "ClimbUser",
            userId: topLoggerGraphQLId,
            tickedFirstAtDate: { $gt: new Date(0) },
          },
        },
        {
          $set: {
            climbId: {
              $replaceOne: {
                input: "$climb.__ref",
                find: "Climb:",
                replacement: "",
              },
            },
            holdColorId: {
              $replaceOne: {
                input: "$holdColor.__ref",
                find: "HoldColor:",
                replacement: "",
              },
            },
          },
        },
        {
          $lookup: {
            from: "toplogger_graphql",
            localField: "climbId",
            foreignField: "id",
            as: "climb",
          },
        },
        {
          $lookup: {
            from: "toplogger_graphql",
            localField: "holdColorId",
            foreignField: "id",
            as: "holdColor",
          },
        },
        {
          $set: {
            climb: { $arrayElemAt: ["$climb", 0] },
            holdColor: { $arrayElemAt: ["$holdColor", 0] },
          },
        },
        {
          $set: {
            gymId: {
              $replaceOne: {
                input: "$climb.gym.__ref",
                find: "Gym:",
                replacement: "",
              },
            },
          },
        },
        {
          $lookup: {
            from: "toplogger_graphql",
            localField: "gymId",
            foreignField: "id",
            as: "gym",
          },
        },
        {
          $set: {
            gym: { $arrayElemAt: ["$gym", 0] },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$tickedFirstAtDate" },
            },
            climbUsers: { $push: "$$ROOT" },
          },
        },
        {
          $project: {
            id: {
              $concat: [
                { $literal: WorkoutSource.TopLogger },
                ":",
                { $literal: topLoggerGraphQLId },
                ":",
                {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: {
                      $arrayElemAt: ["$climbUsers.tickedFirstAtDate", 0],
                    },
                  },
                },
              ],
            },
            _id: 0,
            userId: { $literal: user.id },
            createdAt: { $arrayElemAt: ["$climbUsers.tickedFirstAtDate", 0] },
            updatedAt: { $arrayElemAt: ["$climbUsers.tickedFirstAtDate", 0] },
            workedOutAt: { $arrayElemAt: ["$climbUsers.tickedFirstAtDate", 0] },
            source: { $literal: WorkoutSource.TopLogger },
            location: { $arrayElemAt: ["$climbUsers.gym.name", 0] },
            exercises: [
              {
                exerciseId: 2001,
                sets: {
                  $map: {
                    input: "$climbUsers",
                    as: "climbUser",
                    in: {
                      inputs: [
                        // Grade
                        {
                          value: { $divide: ["$$climbUser.climb.grade", 100] },
                          unit: Unit.FrenchRounded,
                        },
                        // Color
                        {
                          value: {
                            $indexOfArray: [
                              [
                                // Don't mess with the order of these colors
                                "mint",
                                "green",
                                "yellow",
                                "blue",
                                "orange",
                                "red",
                                "black",
                                "pink",
                                "white",
                                "purple",
                              ],
                              { $toLower: "$$climbUser.holdColor.nameLoc" },
                            ],
                          },
                        },
                        // Sent-ness
                        {
                          value: {
                            $cond: {
                              if: { $eq: ["$$climbUser.tickType", 2] },
                              then: 0,
                              else: 1,
                            },
                          },
                        },
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
  }

  yield "materializeAllToploggerWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
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
      { $match: { userId: user.id } },
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
  yield "materializeAllFitocracyWorkouts: start";
  const t = new Date();
  const db = await getDB();

  for (const dataSource of user.dataSources || []) {
    if (dataSource.source !== DataSource.Fitocracy) continue;

    const fitocracyUserId = dataSource.config.userId;

    yield await db
      .collection<Fitocracy.MongoWorkout>("fitocracy_workouts")
      .aggregate([
        { $match: { user_id: fitocracyUserId } },
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
  }

  yield "materializeAllFitocracyWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeAllRunDoubleWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  yield "materializeAllRunDoubleWorkouts: start";
  const t = new Date();
  const db = await getDB();

  for (const dataSource of user.dataSources || []) {
    if (dataSource.source !== DataSource.RunDouble) continue;

    yield await db
      .collection<RunDouble.MongoHistoryItem>("rundouble_runs")
      .aggregate([
        { $match: { userId: dataSource.config.id } },
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
  }

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

  for (const dataSource of user.dataSources || []) {
    if (dataSource.source !== DataSource.KilterBoard) continue;

    const { user_id } = dataSource.config;

    yield await db
      .collection<KilterBoard.Ascent>("kilterboard_ascents")
      .aggregate([
        { $match: { user_id: Number(user_id), is_listed: true } },
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
                        // Angle
                        { value: "$$ascent.angle", unit: Unit.Deg },
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
  }

  yield "materializeAllKilterBoardWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeAllGrippyWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  yield "materializeAllGrippyWorkouts: start";
  const t = new Date();
  const db = await getDB();

  for (const dataSource of user.dataSources || []) {
    if (dataSource.source !== DataSource.Grippy) continue;

    yield await db
      .collection<Grippy.WorkoutLog>("grippy_workout_logs")
      .aggregate([
        { $match: { _io_userId: user.id } },
        {
          $project: {
            _id: 0,
            id: { $toString: "$uuid" },
            userId: { $literal: user.id },
            createdAt: "$start_time",
            updatedAt: "$start_time",
            workedOutAt: "$start_time",
            source: { $literal: WorkoutSource.Grippy },
            exercises: [
              {
                displayName: "$workout.name",
                exerciseId: 2006,
                sets: [
                  {
                    inputs: [
                      { unit: Unit.SEC, value: "$total_hang_time" },
                      {
                        unit: Unit.Percent,
                        value: { $multiply: ["$compliance", 100] },
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
  }

  yield "materializeAllGrippyWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeAllCrimpdWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  yield "materializeAllCrimpdWorkouts: start";
  const t = new Date();
  const db = await getDB();

  for (const dataSource of user.dataSources || []) {
    if (dataSource.source !== DataSource.Crimpd) continue;

    yield await db
      .collection<Crimpd.WorkoutLog>("crimpd_workout_logs")
      .aggregate([
        { $match: { _io_userId: user.id } },
        {
          $project: {
            _id: 0,
            id: "$_id",
            userId: { $literal: user.id },
            createdAt: "$dateCreated",
            updatedAt: "$lastUpdated",
            workedOutAt: "$logDate",
            source: { $literal: WorkoutSource.Crimpd },
            exercises: [
              {
                exerciseId: 2007,
                displayName: "$workout.name",
                sets: [
                  {
                    inputs: [
                      { unit: Unit.SEC, value: "$estimatedWorkDuration" },
                      {
                        unit: Unit.Percent,
                        value: { $multiply: ["$completionPercent", 100] },
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
  }

  yield "materializeAllCrimpdWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}
