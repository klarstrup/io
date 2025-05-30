import type { Session } from "next-auth";
import { SendType, Unit } from "../../../models/exercises";
import { WorkoutSource } from "../../../models/workout";
import { Workouts } from "../../../models/workout.server";
import { HoldScore, HoldScore2 } from "../../../sources/climbalong";
import { ClimbAlongAthletes } from "../../../sources/climbalong.server";
import { CrimpdWorkoutLogs } from "../../../sources/crimpd";
import { FitocracyWorkouts } from "../../../sources/fitocracy.server";
import { GrippyWorkoutLogs } from "../../../sources/grippy";
import { KilterBoardAscents } from "../../../sources/kilterboard.server";
import { MoonBoardLogbookEntries } from "../../../sources/moonboard.server";
import { OnsightCompetitionScores } from "../../../sources/onsight.server";
import { RunDoubleRuns } from "../../../sources/rundouble.server";
import { SportstimingFavorites } from "../../../sources/sportstiming.server";
import { TopLoggerGraphQL } from "../../../sources/toplogger.server";
import { DataSource, UserDataSource } from "../../../sources/utils";

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
        climbedAtDate: { $gt: new Date(0) },
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
    { $set: { climb: { $arrayElemAt: ["$climb", 0] } } },
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
    { $set: { holdColor: { $arrayElemAt: ["$holdColor", 0] } } },
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
    { $set: { gym: { $arrayElemAt: ["$gym", 0] } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$climbedAtDate" },
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
                date: { $arrayElemAt: ["$climbLogs.climbedAtDate", 0] },
              },
            },
          ],
        },
        _id: 0,
        userId: { $literal: user.id },
        createdAt: { $arrayElemAt: ["$climbLogs.climbedAtDate", 0] },
        updatedAt: { $arrayElemAt: ["$climbLogs.climbedAtDate", 0] },
        workedOutAt: { $arrayElemAt: ["$climbLogs.climbedAtDate", 0] },
        source: { $literal: WorkoutSource.TopLogger },
        location: { $arrayElemAt: ["$climbLogs.gym.name", 0] },
        exercises: [
          {
            exerciseId: 2001,
            sets: {
              $map: {
                input: "$climbLogs",
                as: "climbLog",
                in: {
                  inputs: [
                    // Grade
                    {
                      value: { $divide: ["$$climbLog.climb.grade", 100] },
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
        source: { $literal: WorkoutSource.RunDouble },
        exercises: [
          {
            exerciseId: 518,
            sets: [
              {
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

  yield* KilterBoardAscents.aggregate([
    { $match: { user_id: Number(user_id), is_listed: true } },
    {
      $lookup: {
        from: "kilterboard_bids",
        let: {
          climb_uuid: "$climb_uuid",
          angle: "$angle",
          climbed_at: "$climbed_at",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$climb_uuid", "$$climb_uuid"] },
                  { $eq: ["$angle", "$$angle"] },
                  { $lt: ["$climbed_at", "$$climbed_at"] },
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
          climbed_at: "$climbed_at",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$climb_uuid", "$$climb_uuid"] },
                  { $eq: ["$angle", "$$angle"] },
                  { $lt: ["$climbed_at", "$$climbed_at"] },
                ],
              },
            },
          },
        ],
        as: "climb_ascents",
      },
    },
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
                    {
                      value: {
                        $cond: {
                          if: { $gt: [{ $size: "$$ascent.climb_ascents" }, 0] },
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
            { $toString: { $arrayElemAt: ["$entries.User.Id", 0] } },
            ":",
            "$_id",
          ],
        },
        userId: { $literal: user.id },
        createdAt: { $arrayElemAt: ["$entries.DateInserted", 0] },
        updatedAt: { $arrayElemAt: ["$entries.DateInserted", 0] },
        workedOutAt: { $arrayElemAt: ["$entries.DateInserted", 0] },
        source: { $literal: WorkoutSource.MoonBoard },
        exercises: [
          {
            exerciseId: 2003,
            sets: {
              $map: {
                input: "$entries",
                as: "entry",
                in: {
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

  yield* GrippyWorkoutLogs.aggregate([
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
        source: { $literal: WorkoutSource.Onsight },
        exercises: [
          {
            exerciseId: 2001,
            displayName: {
              $arrayElemAt: [{ $split: ["$Competition_name", "/"] }, 0],
            },
            sets: {
              $map: {
                input: "$Ascents",
                as: "ascent",
                in: {
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

  yield* ClimbAlongAthletes.aggregate([
    { $match: { userId: dataSource.config.userId } },
    {
      $lookup: {
        from: "climbalong_performances",
        let: { athleteId: "$athleteId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$athleteId", "$$athleteId"] },
            },
          },
        ],
        as: "performances",
      },
    },
    { $unwind: "$performances" },
    { $replaceRoot: { newRoot: "$performances" } },
    { $match: { numberOfAttempts: { $gt: 0 } } },
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
        source: { $literal: WorkoutSource.ClimbAlong },
        location: "$competition.facility",
        exercises: [
          {
            exerciseId: 2001,
            comment: "$competition.title",
            sets: {
              $map: {
                input: "$performances",
                as: "performance",
                in: {
                  inputs: [
                    // Grade
                    {
                      value: { $literal: null },
                      unit: Unit.FrenchRounded,
                    },
                    // Color
                    { value: { $literal: null } },
                    // Sent-ness
                    {
                      value: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ["$$performance.numberOfAttempts", 1] },
                              {
                                $gt: [
                                  {
                                    $size: {
                                      $filter: {
                                        input: "$$performance.scores",
                                        as: "score",
                                        cond: {
                                          $or: [
                                            {
                                              $eq: [
                                                "$$score.holdScore",
                                                HoldScore.TOP,
                                              ],
                                            },
                                            {
                                              $eq: [
                                                "$$score.holdScore",
                                                HoldScore2.TOP,
                                              ],
                                            },
                                          ],
                                        },
                                        limit: 1,
                                      },
                                    },
                                  },
                                  0,
                                ],
                              },
                            ],
                          },
                          then: SendType.Flash,
                          else: {
                            $cond: {
                              if: {
                                $gt: [
                                  {
                                    $size: {
                                      $filter: {
                                        input: "$$performance.scores",
                                        as: "score",
                                        cond: {
                                          $or: [
                                            {
                                              $eq: [
                                                "$$score.holdScore",
                                                HoldScore.TOP,
                                              ],
                                            },
                                            {
                                              $eq: [
                                                "$$score.holdScore",
                                                HoldScore2.TOP,
                                              ],
                                            },
                                          ],
                                        },
                                        limit: 1,
                                      },
                                    },
                                  },
                                  0,
                                ],
                              },
                              then: SendType.Top,
                              else: {
                                $cond: {
                                  if: {
                                    $gt: [
                                      {
                                        $size: {
                                          $filter: {
                                            input: "$$performance.scores",
                                            as: "score",
                                            cond: {
                                              $or: [
                                                {
                                                  $eq: [
                                                    "$$score.holdScore",
                                                    HoldScore.ZONE,
                                                  ],
                                                },
                                                {
                                                  $eq: [
                                                    "$$score.holdScore",
                                                    HoldScore2.ZONE,
                                                  ],
                                                },
                                              ],
                                            },
                                            limit: 1,
                                          },
                                        },
                                      },
                                      0,
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
        source: { $literal: WorkoutSource.Sportstiming },
        exercises: [
          {
            exerciseId: 518,
            displayName: "$DistanceName",
            sets: [
              {
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
