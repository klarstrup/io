import type { Session } from "next-auth";
import { SendType, Unit } from "../../../models/exercises.types";
import { WorkoutSource } from "../../../models/workout";
import { Workouts } from "../../../models/workout.server";
import {
  ClimbAlongAthletes,
  ClimbAlongPerformances,
} from "../../../sources/climbalong.server";
import { CrimpdWorkoutLogs } from "../../../sources/crimpd";
import { FitocracyWorkouts } from "../../../sources/fitocracy.server";
import { GrippyWorkoutLogDetails } from "../../../sources/grippy";
import {
  KilterBoardAscents,
  KilterBoardBids,
} from "../../../sources/kilterboard.server";
import { MoonBoardLogbookEntries } from "../../../sources/moonboard.server";
import { OnsightCompetitionScores } from "../../../sources/onsight.server";
import { RunDoubleRuns } from "../../../sources/rundouble.server";
import { SportstimingFavorites } from "../../../sources/sportstiming.server";
import { TopLoggerGraphQL } from "../../../sources/toplogger.server";
import { DataSource, UserDataSource } from "../../../sources/utils";
import { epoch } from "../../../utils";

export async function* materializeToploggerWorkouts(
  user: Session["user"],
  dataSource: UserDataSource & { source: DataSource.TopLogger },
) {
  yield "materializeToploggerWorkouts: start";
  const t = new Date();

  const topLoggerGraphQLId = dataSource.config.graphQLId;

  yield* TopLoggerGraphQL.aggregate([
    {
      $match: {
        __typename: "ClimbLog",
        userId: topLoggerGraphQLId,
        climbedAtDate: { $gt: epoch },
      },
    },
    // This sorting puts successful sends first, for the following group stage
    { $sort: { tickType: -1, tickIndex: 1 } },
    {
      $group: {
        _id: {
          climbedAtDate: {
            $dateToString: { format: "%Y-%m-%d", date: "$climbedAtDate" },
          },
          climbId: "$climbId",
          // Don't merge in repeats of the same climb
          repeat: { $eq: ["$tickIndex", 1] },
        },
        climbLog: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$climbLog" } },
    {
      $lookup: {
        from: "toplogger_graphql",
        localField: "climbId",
        foreignField: "id",
        as: "climb",
      },
    },
    { $set: { climb: { $first: "$climb" } } },
    {
      $set: {
        climbGroupClimbId: {
          $replaceOne: {
            input: { $first: "$climb.climbGroupClimbs.__ref" },
            find: "ClimbGroupClimb:",
            replacement: "",
          },
        },
      },
    },
    {
      $lookup: {
        from: "toplogger_graphql",
        localField: "climbGroupClimbId",
        foreignField: "id",
        as: "climbGroupClimb",
      },
    },
    { $set: { climbGroupClimb: { $first: "$climbGroupClimb" } } },
    { $set: { climbGroupId: "$climbGroupClimb.climbGroupId" } },
    {
      $lookup: {
        from: "toplogger_graphql",
        localField: "climbGroupId",
        foreignField: "id",
        as: "climbGroup",
      },
    },
    { $set: { climbGroup: { $first: "$climbGroup" } } },
    {
      $set: {
        holdColorId: {
          $replaceOne: {
            input: "$climb.holdColorId",
            find: "HoldColor:",
            replacement: "",
          },
        },
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
    { $set: { holdColor: { $first: "$holdColor" } } },
    {
      $set: {
        gymId: {
          $replaceOne: {
            input: "$climb.gymId",
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
    { $set: { gym: { $first: "$gym" } } },
    {
      $group: {
        _id: {
          climbedAtDate: {
            $dateToString: { format: "%Y-%m-%d", date: "$climbedAtDate" },
          },
          gymId: "$gymId",
        },
        climbLogs: { $push: "$$ROOT" },
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
                date: { $first: "$climbLogs.climbedAtDate" },
              },
            },
            ":",
            { $first: "$climbLogs.gymId" },
          ],
        },
        _id: 0,
        userId: { $literal: user.id },
        createdAt: { $first: "$climbLogs.climbedAtDate" },
        updatedAt: { $first: "$climbLogs.climbedAtDate" },
        workedOutAt: { $first: "$climbLogs.climbedAtDate" },
        materializedAt: "$$NOW",
        source: { $literal: WorkoutSource.TopLogger },
        location: { $first: "$climbLogs.gym.name" },
        exercises: [
          {
            exerciseId: 2001,
            sets: {
              $map: {
                input: "$climbLogs",
                as: "climbLog",
                in: {
                  meta: {
                    boulderCircuitId: "$$climbLog.climbGroupClimb.climbGroupId",
                    attemptCount: { $add: ["$$climbLog.tryIndex", 1] },
                  },
                  inputs: [
                    // Grade
                    {
                      value: {
                        $cond: [
                          {
                            $and: [
                              { $isArray: "$$climbLog.climb.gradeVoteStats" },
                              {
                                $gt: [
                                  { $size: "$$climbLog.climb.gradeVoteStats" },
                                  0,
                                ],
                              },
                            ],
                          },
                          {
                            $divide: [
                              {
                                $divide: [
                                  {
                                    $reduce: {
                                      input: "$$climbLog.climb.gradeVoteStats",
                                      initialValue: 0,
                                      in: {
                                        $add: [
                                          "$$value",
                                          {
                                            $multiply: [
                                              "$$this.grade",
                                              "$$this.count",
                                            ],
                                          },
                                        ],
                                      },
                                    },
                                  },
                                  {
                                    $reduce: {
                                      input: "$$climbLog.climb.gradeVoteStats",
                                      initialValue: 0,
                                      in: {
                                        $add: ["$$value", "$$this.count"],
                                      },
                                    },
                                  },
                                ],
                              },
                              100,
                            ],
                          },
                          { $divide: ["$$climbLog.climb.grade", 100] },
                        ],
                      },
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
                          { $toLower: "$$climbLog.holdColor.nameLoc" },
                        ],
                      },
                    },
                    // Sent-ness
                    {
                      value: {
                        $cond: {
                          if: { $eq: ["$$climbLog.tickIndex", 1] },
                          then: SendType.Repeat,
                          else: {
                            $cond: {
                              if: { $eq: ["$$climbLog.tickType", 2] },
                              then: SendType.Flash,
                              else: {
                                $cond: {
                                  if: { $eq: ["$$climbLog.tickType", 1] },
                                  then: SendType.Top,
                                  else: SendType.Attempt,
                                },
                              },
                            },
                          },
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
  ]);

  yield "materializeToploggerWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeIoWorkouts(user: Session["user"]) {
  yield "materializeIoWorkouts: start";
  const t = new Date();

  await Workouts.createIndexes([{ key: { userId: 1 } }]);
  yield* Workouts.aggregate([
    { $match: { userId: user.id } },
    { $addFields: { id: { $toString: "$_id" }, _id: "$$REMOVE" } },
    {
      $merge: {
        into: "materialized_workouts_view",
        whenMatched: "replace",
        on: "id",
      },
    },
  ]);

  yield "materializeIoWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeFitocracyWorkouts(
  user: Session["user"],
  dataSource: UserDataSource & { source: DataSource.Fitocracy },
) {
  yield "materializeFitocracyWorkouts: start";
  const t = new Date();

  const fitocracyUserId = dataSource.config.userId;

  await FitocracyWorkouts.createIndexes([
    {
      key: {
        user_id: 1,
        "root_group.children.0.exercise.sets.0.inputs.0": 1,
      },
    },
  ]);
  yield* FitocracyWorkouts.aggregate([
    {
      $match: {
        user_id: fitocracyUserId,
        "root_group.children.0.exercise.sets.0.inputs.0": { $exists: true },
      },
    },
    {
      $project: {
        _id: 0,
        id: { $toString: "$id" },
        userId: { $literal: user.id },
        createdAt: "$updated_timestamp",
        updatedAt: "$updated_timestamp",
        workedOutAt: "$workout_timestamp",
        materializedAt: "$$NOW",
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
                    createdAt: "$updated_timestamp",
                    updatedAt: "$updated_timestamp",
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
  ]);

  yield "materializeFitocracyWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeRunDoubleWorkouts(
  user: Session["user"],
  dataSource: UserDataSource & { source: DataSource.RunDouble },
) {
  yield "materializeRunDoubleWorkouts: start";
  const t = new Date();

  await RunDoubleRuns.createIndexes([{ key: { userId: 1 } }]);
  yield* RunDoubleRuns.aggregate([
    { $match: { userId: dataSource.config.id } },
    {
      $project: {
        _id: 0,
        id: { $toString: "$key" },
        userId: { $literal: user.id },
        createdAt: "$completedAt",
        updatedAt: "$completedAt",
        workedOutAt: "$completedAt",
        materializedAt: "$$NOW",
        source: { $literal: WorkoutSource.RunDouble },
        exercises: [
          {
            exerciseId: 518,
            sets: [
              {
                createdAt: "$completedAt",
                updatedAt: "$completedAt",
                inputs: [
                  { unit: Unit.SEC, value: { $divide: ["$runTime", 1000] } },
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
  ]);

  yield "materializeRunDoubleWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeKilterBoardWorkouts(
  user: Session["user"],
  dataSource: UserDataSource & { source: DataSource.KilterBoard },
) {
  yield "materializeKilterBoardWorkouts: start";
  const t = new Date();

  const { user_id } = dataSource.config;

  await KilterBoardAscents.createIndexes([
    { key: { user_id: 1, is_listed: 1 } },
  ]);
  await KilterBoardBids.createIndexes([{ key: { user_id: 1, is_listed: 1 } }]);
  yield* KilterBoardAscents.aggregate([
    { $unionWith: "kilterboard_bids" },
    { $match: { user_id: Number(user_id), is_listed: true } },
    {
      $group: {
        _id: {
          climb_uuid: "$climb_uuid",
          angle: "$angle",
          date: { $dateToString: { format: "%Y-%m-%d", date: "$climbed_at" } },
        },
        ascentsAndBids: { $push: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: { $first: "$ascentsAndBids" } } },
    {
      $set: {
        climbed_at_day_start: {
          $dateTrunc: { date: "$climbed_at", unit: "day" },
        },
        climbed_at_day_end: {
          $dateSubtract: {
            startDate: {
              $dateAdd: {
                startDate: { $dateTrunc: { date: "$climbed_at", unit: "day" } },
                unit: "day",
                amount: 1,
              },
            },
            unit: "millisecond",
            amount: 1,
          },
        },
      },
    },
    {
      $lookup: {
        from: "kilterboard_bids",
        let: {
          climb_uuid: "$climb_uuid",
          angle: "$angle",
          climbed_at_day_start: "$climbed_at_day_start",
          climbed_at_day_end: "$climbed_at_day_end",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$climb_uuid", "$$climb_uuid"] },
                  { $eq: ["$angle", "$$angle"] },
                  { $gt: ["$climbed_at", "$$climbed_at_day_start"] },
                  { $lt: ["$climbed_at", "$$climbed_at_day_end"] },
                ],
              },
            },
          },
        ],
        as: "climb_bids",
      },
    },
    {
      $lookup: {
        from: "kilterboard_ascents",
        let: {
          climb_uuid: "$climb_uuid",
          angle: "$angle",
          climbed_at_day_start: "truncatedClimbedAt",
          climbed_at_day_end: "dayAfterTruncatedClimbedAt",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$climb_uuid", "$$climb_uuid"] },
                  { $eq: ["$angle", "$$angle"] },
                  { $gt: ["$climbed_at", "$$climbed_at_day_start"] },
                  { $lt: ["$climbed_at", "$$climbed_at_day_end"] },
                ],
              },
            },
          },
        ],
        as: "climb_ascents",
      },
    },
    {
      $lookup: {
        from: "kilterboard_climb_stats",
        let: {
          climb_uuid: "$climb_uuid",
          angle: "$angle",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$climb_uuid", "$$climb_uuid"] },
                  { $eq: ["$angle", "$$angle"] },
                ],
              },
            },
          },
        ],
        as: "climb_stats",
      },
    },
    {
      $lookup: {
        from: "kilterboard_climbs",
        foreignField: "uuid",
        localField: "climb_uuid",
        as: "climb",
      },
    },
    { $set: { climb: { $first: "$climb" } } },
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
            { $toString: { $first: "$ascents.user_id" } },
            ":",
            "$_id",
          ],
        },
        userId: { $literal: user.id },
        createdAt: { $first: "$ascents.created_at" },
        updatedAt: { $last: "$ascents.updated_at" },
        workedOutAt: { $first: "$ascents.climbed_at" },
        materializedAt: "$$NOW",
        source: { $literal: WorkoutSource.KilterBoard },
        exercises: [
          {
            exerciseId: 2003,
            sets: {
              $map: {
                input: "$ascents",
                as: "ascent",
                in: {
                  createdAt: "$$ascent.created_at",
                  updatedAt: "$$ascent.updated_at",
                  meta: {
                    attemptCount: { $size: "$$ascent.climb_bids" },
                    boulderName: "$$ascent.climb.name",
                  },
                  inputs: [
                    // Grade
                    {
                      value: { $first: "$$ascent.climb_stats.grade_average" },
                      unit: Unit.FrenchRounded,
                    },
                    // Color
                    { value: NaN },
                    // Sent-ness
                    {
                      value: {
                        $cond: {
                          // Only actual ascents have an attempt_id, bids do not
                          if: { $eq: ["$$ascent.attempt_id", 0] },
                          then: {
                            $cond: {
                              if: {
                                $gt: [{ $size: "$$ascent.climb_ascents" }, 0],
                              },
                              then: SendType.Repeat,
                              else: {
                                $cond: {
                                  if: {
                                    $eq: [{ $size: "$$ascent.climb_bids" }, 0],
                                  },
                                  then: SendType.Flash,
                                  else: SendType.Top,
                                },
                              },
                            },
                          },
                          else: SendType.Attempt,
                        },
                      },
                    },
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
  ]);

  yield "materializeKilterBoardWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeMoonBoardWorkouts(
  user: Session["user"],
  dataSource: UserDataSource & { source: DataSource.MoonBoard },
) {
  yield "materializeMoonBoardWorkouts: start";
  const t = new Date();

  const { user_id } = dataSource.config;

  await MoonBoardLogbookEntries.createIndexes([{ key: { "User.Id": 1 } }]);
  yield* MoonBoardLogbookEntries.aggregate([
    { $match: { "User.Id": user_id } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$DateClimbed" } },
        entries: { $push: "$$ROOT" },
      },
    },
    {
      $project: {
        _id: 0,
        id: {
          $concat: [
            { $literal: WorkoutSource.MoonBoard },
            ":",
            { $toString: { $first: "$entries.User.Id" } },
            ":",
            "$_id",
          ],
        },
        userId: { $literal: user.id },
        createdAt: { $first: "$entries.DateInserted" },
        updatedAt: { $first: "$entries.DateInserted" },
        workedOutAt: { $first: "$entries.DateInserted" },
        materializedAt: "$$NOW",
        source: { $literal: WorkoutSource.MoonBoard },
        exercises: [
          {
            exerciseId: 2003,
            sets: {
              $map: {
                input: "$entries",
                as: "entry",
                in: {
                  meta: { attemptCount: { $add: ["$$entry.Attempts", 1] } },
                  inputs: [
                    // Grade
                    {
                      value: "$$entry.Problem.GradeNumber",
                      unit: Unit.FrenchRounded,
                    },
                    // Color
                    { value: NaN },
                    // Sent-ness
                    {
                      value: {
                        $cond: {
                          if: {
                            $eq: ["$$entry.Rating", 0],
                          },
                          then: SendType.Attempt,
                          else: {
                            $cond: {
                              if: {
                                $eq: ["$$entry.Attempts", 0],
                              },
                              then: SendType.Flash,
                              else: SendType.Top,
                            },
                          },
                        },
                      },
                    },
                    // Angle
                    {
                      value: {
                        $cond: {
                          if: {
                            $eq: [
                              "$$entry.Problem.MoonBoardConfiguration.Id",
                              2,
                            ],
                          },
                          then: 25,
                          else: 40,
                        },
                      },
                      unit: Unit.Deg,
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
  ]);

  yield "materializeMoonBoardWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeGrippyWorkouts(
  user: Session["user"],
  // TODO: Explain why the user ID is embedded and the data source isn't used
  _dataSource: UserDataSource & { source: DataSource.Grippy },
) {
  yield "materializeGrippyWorkouts: start";
  const t = new Date();

  await GrippyWorkoutLogDetails.createIndexes([{ key: { _io_userId: 1 } }]);
  yield* GrippyWorkoutLogDetails.aggregate([
    { $match: { _io_userId: user.id } },
    {
      $lookup: {
        from: "grippy_workout_details",
        localField: "workout.uuid",
        foreignField: "uuid",
        as: "workout",
      },
    },
    { $set: { workout: { $first: "$workout" } } },
    {
      $project: {
        _id: 0,
        id: { $toString: "$uuid" },
        userId: { $literal: user.id },
        // Hard-coded home location since Grippy doesn't have location data, and most users only have one location
        locationId: "68926831b5dadadcf3f9d0ee",
        // This is in the wrong timezone, fix in ingest?
        createdAt: "$start_time",
        updatedAt: "$end_time",
        workedOutAt: "$start_time",
        materializedAt: "$$NOW",
        source: { $literal: WorkoutSource.Grippy },
        exercises: [
          {
            $cond: {
              if: {
                $regexMatch: { input: "$workout.name", regex: /Dead Hang/ },
              },
              then: {
                exerciseId: 1434,
                sets: {
                  $map: {
                    input: "$workout.sets",
                    as: "set",
                    in: {
                      createdAt: "$start_time",
                      updatedAt: "$end_time",
                      inputs: [{ unit: Unit.SEC, value: "$$set.hang_time" }],
                    },
                  },
                },
              },
              else: {
                displayName: "$workout.name",
                exerciseId: 2006,
                sets: [
                  {
                    createdAt: "$start_time",
                    updatedAt: "$end_time",
                    inputs: [
                      { unit: Unit.SEC, value: "$total_hang_time" },
                      {
                        unit: Unit.Percent,
                        value: { $multiply: ["$compliance", 100] },
                      },
                      {
                        unit: { $toLower: "$weight_added_unit" },
                        value: { $abs: "$weight_added" },
                        assistType: {
                          $cond: {
                            if: { $gte: ["$weight_added", 0] },
                            then: "weighted",
                            else: "assisted",
                          },
                        },
                      },
                    ],
                  },
                ],
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
  ]);

  yield "materializeGrippyWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeCrimpdWorkouts(
  user: Session["user"],
  // TODO: Explain why the user ID is embedded and the data source isn't used
  _dataSource: UserDataSource & { source: DataSource.Crimpd },
) {
  yield "materializeCrimpdWorkouts: start";
  const t = new Date();

  await CrimpdWorkoutLogs.createIndexes([{ key: { _io_userId: 1 } }]);
  yield* CrimpdWorkoutLogs.aggregate([
    { $match: { _io_userId: user.id } },
    {
      $project: {
        _id: 0,
        id: "$_id",
        userId: { $literal: user.id },
        createdAt: "$dateCreated",
        updatedAt: "$lastUpdated",
        workedOutAt: "$logDate",
        materializedAt: "$$NOW",
        source: { $literal: WorkoutSource.Crimpd },
        exercises: [
          {
            exerciseId: 2007,
            displayName: "$workout.name",
            sets: [
              {
                createdAt: "$dateCreated",
                updatedAt: "$lastUpdated",
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
  ]);

  yield "materializeCrimpdWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeOnsightWorkouts(
  user: Session["user"],
  dataSource: UserDataSource & { source: DataSource.Onsight },
) {
  yield "materializeOnsightWorkouts: start";
  const t = new Date();

  yield* OnsightCompetitionScores.aggregate([
    { $match: { Username: dataSource.config.username } },
    {
      $project: {
        _id: 0,
        id: "$_id",
        userId: { $literal: user.id },
        createdAt: "$_createdAt",
        updatedAt: "$_updatedAt",
        workedOutAt: "$_createdAt",
        materializedAt: "$$NOW",
        source: { $literal: WorkoutSource.Onsight },
        exercises: [
          {
            exerciseId: 2001,
            displayName: { $first: { $split: ["$Competition_name", "/"] } },
            sets: {
              $map: {
                input: "$Ascents",
                as: "ascent",
                in: {
                  createdAt: "$_createdAt",
                  updatedAt: "$_updatedAt",
                  meta: {
                    attemptCount: {
                      $toInt: {
                        $arrayElemAt: [{ $split: ["$$ascent", "/"] }, 0],
                      },
                    },
                  },
                  inputs: [
                    // Grade
                    { value: { $literal: null }, unit: Unit.FrenchRounded },
                    // Color
                    { value: { $literal: null } },
                    // Sent-ness
                    {
                      value: {
                        $cond: {
                          if: {
                            $and: [
                              {
                                $eq: [
                                  {
                                    $arrayElemAt: [
                                      { $split: ["$$ascent", "/"] },
                                      2,
                                    ],
                                  },
                                  "2",
                                ],
                              },
                              {
                                $eq: [
                                  {
                                    $arrayElemAt: [
                                      { $split: ["$$ascent", "/"] },
                                      1,
                                    ],
                                  },
                                  "1",
                                ],
                              },
                              {
                                $eq: [
                                  {
                                    $arrayElemAt: [
                                      { $split: ["$$ascent", "/"] },
                                      0,
                                    ],
                                  },
                                  "1",
                                ],
                              },
                            ],
                          },
                          then: SendType.Flash,
                          else: {
                            $cond: {
                              if: {
                                $eq: [
                                  {
                                    $arrayElemAt: [
                                      { $split: ["$$ascent", "/"] },
                                      2,
                                    ],
                                  },
                                  "2",
                                ],
                              },
                              then: SendType.Top,
                              else: {
                                $cond: {
                                  if: {
                                    $eq: [
                                      {
                                        $arrayElemAt: [
                                          { $split: ["$$ascent", "/"] },
                                          1,
                                        ],
                                      },
                                      "1",
                                    ],
                                  },
                                  then: SendType.Zone,
                                  else: {
                                    $cond: {
                                      if: {
                                        $gt: [
                                          {
                                            $arrayElemAt: [
                                              { $split: ["$$ascent", "/"] },
                                              0,
                                            ],
                                          },
                                          0,
                                        ],
                                      },
                                      then: SendType.Attempt,
                                      else: { $literal: null },
                                    },
                                  },
                                },
                              },
                            },
                          },
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
  ] as const);

  yield "materializeOnsightWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeClimbalongWorkouts(
  user: Session["user"],
  dataSource: UserDataSource & { source: DataSource.ClimbAlong },
) {
  yield "materializeClimbalongWorkouts: start";
  const t = new Date();

  await ClimbAlongPerformances.createIndexes([{ key: { athleteId: 1 } }]);
  await ClimbAlongAthletes.createIndexes([{ key: { athleteId: 1 } }]);
  yield* ClimbAlongAthletes.aggregate([
    { $match: { userId: dataSource.config.userId } },
    {
      $lookup: {
        from: "climbalong_performances",
        localField: "athleteId",
        foreignField: "athleteId",
        as: "performances",
      },
    },
    { $unwind: "$performances" },
    { $replaceRoot: { newRoot: "$performances" } },
    { $match: { numberOfAttempts: { $gt: 0 } } },
    // TODO: Actually figure out what holds are zones and tops instead of assuming
    // there are only 0-2 scores per performance
    /*
    {
      $lookup: {
        from: "climbalong_holds",
        localField: "problemId",
        foreignField: "problemId",
        as: "holds",
      },
    },
    {
      $set: {
        holds: { $sortArray: { input: "$holds", sortBy: { holdScore: -1 } } },
      },
    },
    */
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$registrationTime" },
        },
        athleteId: { $first: "$athleteId" },
        circuitId: { $first: "$circuitId" },
        registrationTime: { $first: "$registrationTime" },
        performances: { $push: "$$ROOT" },
      },
    },
    {
      $lookup: {
        from: "climbalong_athletes",
        localField: "athleteId",
        foreignField: "athleteId",
        as: "athlete",
      },
    },
    { $set: { athlete: { $first: "$athlete" } } },
    {
      $lookup: {
        from: "climbalong_competitions",
        localField: "athlete.competitionId",
        foreignField: "competitionId",
        as: "competition",
      },
    },
    { $set: { competition: { $first: "$competition" } } },
    ///*
    {
      $project: {
        _id: 0,
        id: {
          $concat: [
            { $literal: WorkoutSource.ClimbAlong },
            ":",
            { $toString: "$circuitId" },
            ":",
            "$_id",
          ],
        },
        userId: { $literal: user.id },
        createdAt: "$registrationTime",
        updatedAt: "$registrationTime",
        workedOutAt: "$registrationTime",
        materializedAt: "$$NOW",
        source: { $literal: WorkoutSource.ClimbAlong },
        location: "$competition.facility",
        // Hard coded location IDs for ClimbAlong gyms in Copenhagen,
        // gotta actually materialize these somehow X.X
        locationId: {
          $cond: {
            if: {
              $regexMatch: {
                input: "$competition.address",
                regex: /Tobaksvejen/,
              },
            },
            // Bison Boulders Tobaksbyen
            then: "6892682eb5dadadcf3f9d0e6",
            else: {
              $cond: {
                if: {
                  $regexMatch: {
                    input: "$competition.address",
                    regex: /Flæsketorvet/,
                  },
                },
                // Bison Boulders Kødbyen
                then: "68daaf911eff67d40a5c52ec",
                else: {
                  $cond: {
                    if: {
                      $regexMatch: {
                        input: "$competition.address",
                        regex: /Strandmarksvej/,
                      },
                    },
                    // Boulders Hvidovre
                    then: "6892682db5dadadcf3f9d0e3",
                    else: null,
                  },
                },
              },
            },
          },
        },
        exercises: [
          {
            exerciseId: 2001,
            comment: "$competition.title",
            sets: {
              $map: {
                input: "$performances",
                as: "performance",
                in: {
                  createdAt: "$registrationTime",
                  updatedAt: "$registrationTime",
                  meta: {
                    attemptCount: "$$performance.numberOfAttempts",
                  },
                  inputs: [
                    // Grade
                    { value: { $literal: null }, unit: Unit.FrenchRounded },
                    // Color
                    { value: { $literal: null } },
                    // Sent-ness
                    {
                      // There's an assumption here that there are only 0 to 2 scores; nada, zone, top
                      value: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ["$$performance.numberOfAttempts", 1] },
                              { $gte: [{ $size: "$$performance.scores" }, 2] },
                            ],
                          },
                          then: SendType.Flash,
                          else: {
                            $cond: {
                              if: {
                                $gte: [{ $size: "$$performance.scores" }, 2],
                              },
                              then: SendType.Top,
                              else: {
                                $cond: {
                                  if: {
                                    $gte: [
                                      { $size: "$$performance.scores" },
                                      1,
                                    ],
                                  },
                                  then: SendType.Zone,
                                  else: SendType.Attempt,
                                },
                              },
                            },
                          },
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
    //*/
  ]);

  yield "materializeClimbalongWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeSportstimingWorkouts(
  user: Session["user"],
  dataSource: UserDataSource & { source: DataSource.Sportstiming },
) {
  yield "materializeSportstimingWorkouts: start";
  const t = new Date();

  yield* SportstimingFavorites.aggregate([
    { $match: { Name: new RegExp(dataSource.config.name, "i") } },
    {
      $project: {
        _id: 0,
        id: "$_id",
        userId: { $literal: user.id },
        createdAt: "$StartTime",
        updatedAt: "$StartTime",
        workedOutAt: "$StartTime",
        materializedAt: "$$NOW",
        source: { $literal: WorkoutSource.Sportstiming },
        exercises: [
          {
            exerciseId: 518,
            displayName: "$DistanceName",
            sets: [
              {
                createdAt: "$StartTime",
                updatedAt: "$StartTime",
                inputs: [
                  { unit: Unit.SEC, value: "$LastSplitTimeSeconds" },
                  { unit: Unit.M, value: "$_io_TotalDistance" },
                  {
                    unit: Unit.MinKM,
                    value: {
                      $divide: [
                        { $divide: ["$LastSplitTimeSeconds", 60] },
                        { $divide: ["$_io_TotalDistance", 1000] },
                      ],
                    },
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
  ] as const);

  yield "materializeSportstimingWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export const sourceToMaterializer = {
  [DataSource.ClimbAlong]: materializeClimbalongWorkouts,
  [DataSource.Crimpd]: materializeCrimpdWorkouts,
  [DataSource.Fitocracy]: materializeFitocracyWorkouts,
  [DataSource.Grippy]: materializeGrippyWorkouts,
  [DataSource.KilterBoard]: materializeKilterBoardWorkouts,
  [DataSource.MoonBoard]: materializeMoonBoardWorkouts,
  [DataSource.Onsight]: materializeOnsightWorkouts,
  [DataSource.RunDouble]: materializeRunDoubleWorkouts,
  [DataSource.Sportstiming]: materializeSportstimingWorkouts,
  [DataSource.TopLogger]: materializeToploggerWorkouts,
} satisfies Partial<{
  [Source in DataSource]: (
    user: Session["user"],
    dataSource: UserDataSource & { source: Source },
  ) => AsyncGenerator;
}>;
