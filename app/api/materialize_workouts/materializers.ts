import type { Session } from "next-auth";
import { SendType, Unit } from "../../../models/exercises";
import { WorkoutSource } from "../../../models/workout";
import { Workouts } from "../../../models/workout.server";
import { HoldScore, HoldScore2 } from "../../../sources/climbalong";
import { ClimbAlongAthletes } from "../../../sources/climbalong.server";
import { CrimpdWorkoutLogs } from "../../../sources/crimpd";
import { FitocracyWorkouts } from "../../../sources/fitocracy.server";
import { GrippyWorkoutLogs } from "../../../sources/grippy";
import { KilterBoardAscents } from "../../../sources/kilterboard";
import { RunDoubleRuns } from "../../../sources/rundouble.server";
import { DataSource } from "../../../sources/utils";
import { TopLoggerGraphQL } from "../../../utils/graphql";

export async function* materializeAllToploggerWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  yield "materializeAllToploggerWorkouts: start";
  const t = new Date();

  for (const dataSource of user.dataSources || []) {
    if (dataSource.source !== DataSource.TopLogger) continue;

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
        $set: {
          climbId: {
            $replaceOne: {
              input: "$climb.__ref",
              find: "Climb:",
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
      { $set: { climb: { $arrayElemAt: ["$climb", 0] } } },
      {
        $set: {
          holdColorId: {
            $replaceOne: {
              input: "$climb.holdColor.__ref",
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
                  date: {
                    $arrayElemAt: ["$climbLogs.climbedAtDate", 0],
                  },
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

  yield* Workouts.aggregate([
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
  ]);

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

  for (const dataSource of user.dataSources || []) {
    if (dataSource.source !== DataSource.Fitocracy) continue;

    const fitocracyUserId = dataSource.config.userId;

    yield* FitocracyWorkouts.aggregate([
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
    ]);
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

  for (const dataSource of user.dataSources || []) {
    if (dataSource.source !== DataSource.RunDouble) continue;

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
    ]);
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

  for (const dataSource of user.dataSources || []) {
    if (dataSource.source !== DataSource.KilterBoard) continue;

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

  for (const dataSource of user.dataSources || []) {
    if (dataSource.source !== DataSource.Grippy) continue;

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

  for (const dataSource of user.dataSources || []) {
    if (dataSource.source !== DataSource.Crimpd) continue;

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
  }

  yield "materializeAllCrimpdWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}

export async function* materializeAllClimbalongWorkouts({
  user,
}: {
  user: Session["user"];
}) {
  yield "materializeAllClimbalongWorkouts: start";
  const t = new Date();

  for (const dataSource of user.dataSources || []) {
    if (dataSource.source !== DataSource.ClimbAlong) continue;

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
  }

  yield "materializeAllClimbalongWorkouts: done in " +
    (new Date().getTime() - t.getTime()) +
    "ms";
}
