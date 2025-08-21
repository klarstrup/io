/* eslint-disable no-unexpected-multiline */
import {
  eachMonthOfInterval,
  endOfMonth,
  startOfMonth,
  subMonths,
  subYears,
} from "date-fns";
import type { WithId } from "mongodb";
import type { Session } from "next-auth";
import type { PRType } from "../lib";
import { proxyCollection } from "../utils.server";
import {
  AssistType,
  exercisesById,
  InputType,
  SendType,
  TagType,
} from "./exercises";
import type { LocationData } from "./location";
import {
  getSetGrade,
  isClimbingExercise,
  type WorkoutData,
  type WorkoutExercise,
  type WorkoutExerciseSet,
  type WorkoutExerciseSetInput,
} from "./workout";

export const Workouts = proxyCollection<Omit<WorkoutData, "id">>("workouts");

export const MaterializedWorkoutsView = proxyCollection<
  WorkoutData & { materializedAt?: Date }
>("materialized_workouts_view");

export const getNextSets = async ({
  user,
  to,
}: {
  user: Session["user"];
  to: Date;
}) => {
  console.time(`getNextSets for user ${user.id} to ${to.toISOString()}`);
  try {
    return (
      await Promise.all(
        (user.exerciseSchedules || [])
          .filter(({ enabled }) => enabled)
          .map(async (scheduleEntry) => {
            const workout = (
              await MaterializedWorkoutsView.aggregate<{
                workedOutAt: Date;
                exercise: WorkoutExercise;
              }>([
                {
                  $match: {
                    userId: user.id,
                    "exercises.exerciseId": scheduleEntry.exerciseId,
                    workedOutAt: { $lte: to },
                    deletedAt: { $exists: false },
                  },
                },
                { $sort: { workedOutAt: -1 } },
                { $limit: 1 },
                {
                  $project: {
                    _id: 0,
                    workedOutAt: 1,
                    exercise: {
                      $first: {
                        $filter: {
                          input: "$exercises",
                          as: "exercise",
                          cond: {
                            $eq: [
                              "$$exercise.exerciseId",
                              scheduleEntry.exerciseId,
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              ])
                [Symbol.asyncIterator]()
                .next()
            ).value;

            if (isClimbingExercise(scheduleEntry.exerciseId)) {
              if (scheduleEntry.workingSets && scheduleEntry.workingSets > 0) {
                const workouts = MaterializedWorkoutsView.aggregate<{
                  workedOutAt: Date;
                  exercise: WorkoutExercise;
                }>([
                  {
                    $match: {
                      userId: user.id,
                      "exercises.exerciseId": scheduleEntry.exerciseId,
                      workedOutAt: { $lte: to },
                      deletedAt: { $exists: false },
                    },
                  },
                  {
                    $sort: { workedOutAt: -1 },
                  },
                  {
                    $project: {
                      _id: 0,
                      workedOutAt: 1,
                      exercise: {
                        $first: {
                          $filter: {
                            input: "$exercises",
                            as: "exercise",
                            cond: {
                              $eq: [
                                "$$exercise.exerciseId",
                                scheduleEntry.exerciseId,
                              ],
                            },
                          },
                        },
                      },
                    },
                  },
                ]);
                for await (const { workedOutAt, exercise } of workouts) {
                  const successfulSets = exercise.sets.filter(
                    (set) =>
                      (set.inputs[2]?.value as SendType) === SendType.Flash ||
                      (set.inputs[2]?.value as SendType) === SendType.Top ||
                      (set.inputs[2]?.value as SendType) === SendType.Repeat,
                  );
                  const successful =
                    successfulSets.length >= scheduleEntry.workingSets;

                  if (successful) {
                    return {
                      workedOutAt,
                      exerciseId: scheduleEntry.exerciseId,
                      successful: true,
                      nextWorkingSets: scheduleEntry.workingSets ?? NaN,
                      nextWorkingSetInputs: [],
                      scheduleEntry,
                    };
                  }
                }
              }

              return {
                workedOutAt: workout?.workedOutAt || null,
                exerciseId: scheduleEntry.exerciseId,
                successful: true,
                nextWorkingSets: scheduleEntry.workingSets ?? NaN,
                nextWorkingSetInputs: [],
                scheduleEntry,
              };
            }

            const exercise = workout?.exercise;
            const exerciseDefinition = exercisesById[scheduleEntry.exerciseId]!;
            const weightInputIndex = exerciseDefinition.inputs.findIndex(
              ({ type }) =>
                type === InputType.Weight ||
                type === InputType.Weightassist ||
                type === InputType.Time,
            );
            const repsInputIndex = exerciseDefinition.inputs.findIndex(
              ({ type }) => type === InputType.Reps,
            );
            const heaviestSet = exercise?.sets.reduce((acc, set) => {
              const setReps = set.inputs[repsInputIndex]?.value;
              const setWeight = set.inputs[weightInputIndex]?.value;
              const accWeight = acc?.inputs[weightInputIndex]?.value;
              return setWeight &&
                setReps &&
                scheduleEntry.workingReps &&
                (!accWeight || setWeight > accWeight) &&
                setReps >= scheduleEntry.workingReps
                ? set
                : acc;
            }, exercise.sets[0]);

            const heaviestSetWeight =
              heaviestSet?.inputs[weightInputIndex]?.value ||
              scheduleEntry.baseWeight;

            const workingSets =
              (heaviestSetWeight !== undefined &&
                exercise?.sets.filter(
                  ({ inputs }) =>
                    inputs[weightInputIndex]?.value === heaviestSetWeight,
                )) ||
              null;
            const successful =
              workingSets &&
              scheduleEntry.workingSets &&
              scheduleEntry.workingReps &&
              workingSets.length >= scheduleEntry.workingSets &&
              workingSets.every(
                ({ inputs }) =>
                  inputs[repsInputIndex] &&
                  inputs[repsInputIndex].value >= scheduleEntry.workingReps!,
              );

            const finalWorkingSetReps =
              workingSets?.[workingSets.length - 1]?.inputs[repsInputIndex]
                ?.value;

            const goalWeight =
              scheduleEntry.deloadFactor && scheduleEntry.increment
                ? heaviestSetWeight !== undefined
                  ? successful
                    ? finalWorkingSetReps === scheduleEntry.workingReps! * 2
                      ? scheduleEntry.increment * 2 + heaviestSetWeight
                      : scheduleEntry.increment + heaviestSetWeight
                    : scheduleEntry.deloadFactor * heaviestSetWeight
                  : scheduleEntry.baseWeight
                : null;

            const nextWorkingSetsWeight = goalWeight
              ? // Barbell exercises use two plates so not all subdivisions are possible
                exerciseDefinition.tags?.find(
                  ({ name, type }) =>
                    name === "Barbell" && type === TagType.Equipment,
                ) && Math.abs(goalWeight - Math.round(goalWeight)) < 0.5
                ? Math.round(goalWeight)
                : goalWeight
              : goalWeight;

            return {
              workedOutAt: workout?.workedOutAt || null,
              exerciseId: scheduleEntry.exerciseId,
              successful,
              nextWorkingSetInputs: exerciseDefinition.inputs.map(
                ({ type, metric_unit }, inputIndex): WorkoutExerciseSetInput =>
                  nextWorkingSetsWeight &&
                  (type === InputType.Weight ||
                    type === InputType.Weightassist ||
                    type === InputType.Time)
                    ? {
                        value: nextWorkingSetsWeight,
                        unit:
                          exercise?.sets[0]?.inputs[inputIndex]?.unit ||
                          metric_unit,
                      }
                    : scheduleEntry.workingReps && type === InputType.Reps
                      ? { value: scheduleEntry.workingReps }
                      : { value: 0 },
              ),
              nextWorkingSets: scheduleEntry.workingSets ?? NaN,
              scheduleEntry,
            };
          }),
      )
    )
      .filter(Boolean)
      .sort(
        (a, b) =>
          (a.workedOutAt?.getTime() || 0) - (b.workedOutAt?.getTime() || 0),
      );
  } finally {
    console.timeEnd(`getNextSets for user ${user.id} to ${to.toISOString()}`);
  }
};

export const noPR = {
  allTimePR: false,
  oneYearPR: false,
  threeMonthPR: false,
} satisfies Record<PRType, boolean>;

export function getIsSetPR(
  workout: WorkoutData,
  precedingWorkouts: WithId<WorkoutData>[],
  exerciseId: WorkoutData["exercises"][number]["exerciseId"],
  set: WorkoutExerciseSet,
) {
  const exercise = exercisesById[exerciseId];
  if (!exercise) return noPR;

  const inputValues = set.inputs.map(
    ({ assistType, value }) =>
      (assistType === AssistType.Assisted ? -value : value) || 0,
  );
  const now1YearAgo = subYears(workout.workedOutAt, 1);
  const now3MonthsAgo = subMonths(workout.workedOutAt, 3);
  let allTimePR = true;
  let oneYearPR = true;
  let threeMonthPR = true;
  for (const precedingWorkout of [...precedingWorkouts, workout]) {
    for (const workoutExercise of precedingWorkout.exercises) {
      if (workoutExercise.exerciseId !== exerciseId) continue;

      setLoop: for (const exerciseSet of workoutExercise.sets) {
        // Optimistic identity check
        if (exerciseSet === set) break;
        const inputs = exerciseSet.inputs;

        for (const [index, { type: inputType }] of exercise.inputs.entries()) {
          const input = inputs[index];
          let value = input?.value;
          if (value === undefined) {
            if (inputType !== InputType.Weightassist) continue;

            value = 0;
          }
          value = input?.assistType === AssistType.Assisted ? -value : value;
          const inputValue = inputValues[index]!;

          if (
            (inputType === InputType.Pace || inputType === InputType.Time) &&
            // Calisthenics are typically done for time, not for speed
            !exercise.tags?.some(
              ({ name, type }) =>
                name === "Calisthenics" && type === TagType.Type,
            )
              ? value > inputValue
              : value < inputValue
          ) {
            continue setLoop;
          }
        }

        allTimePR = false;

        if (precedingWorkout.workedOutAt > now1YearAgo) {
          oneYearPR = false;
        }

        if (precedingWorkout.workedOutAt > now3MonthsAgo) {
          threeMonthPR = false;
        }
      }
    }
  }

  return {
    allTimePR,
    oneYearPR,
    threeMonthPR,
  };
}

export const updateLocationCounts = async (userId: Session["user"]["id"]) =>
  await MaterializedWorkoutsView.aggregate([
    {
      $match: {
        userId,
        locationId: { $exists: true, $ne: null },
        deletedAt: { $exists: false },
      },
    },
    { $addFields: { locationId: { $toObjectId: "$locationId" } } },
    {
      $lookup: {
        from: "locations",
        localField: "locationId",
        foreignField: "_id",
        as: "location",
      },
    },
    { $set: { location: { $first: "$location" } } },
    {
      $group: {
        _id: { locationId: { $toString: "$locationId" }, userId: "$userId" },
        location: { $first: "$location" },
        userId: { $first: "$userId" },
        visitCount: { $count: {} },
        mostRecentVisit: { $max: "$workedOutAt" },
      },
    },
    { $merge: { into: "workout_locations_view", whenMatched: "replace" } },
  ]).toArray();

export interface IWorkoutLocationsView {
  location: WithId<LocationData>;
  visitCount?: number;
  mostRecentVisit: Date | null;
}

export const WorkoutLocationsView = proxyCollection<IWorkoutLocationsView>(
  "workout_locations_view",
);

export const getAllWorkoutLocations = async (user: Session["user"]) => {
  await WorkoutLocationsView.createIndexes([{ key: { userId: 1 } }]);

  return (await WorkoutLocationsView.find({ userId: user.id }).toArray()).map(
    (location) => ({
      ...location,
      _id: JSON.stringify(location._id),
      location: { ...location.location, _id: location.location._id.toString() },
    }),
  );
};

export const updateExerciseCounts = async (userId: Session["user"]["id"]) =>
  await WorkoutExercisesView.aggregate([
    { $match: { userId, deletedAt: { $exists: false } } },
    { $unwind: "$exercises" },
    {
      $group: {
        _id: { exerciseId: "$exercises.exerciseId", userId },
        exerciseId: { $first: "$exercises.exerciseId" },
        userId: { $first: "$userId" },
        exerciseCount: { $count: {} },
        workedOutAt: { $max: "$workedOutAt" },
      },
    },
    {
      $replaceWith: {
        $setField: { field: "userId", input: "$$ROOT", value: userId },
      },
    },
    { $merge: { into: "workout_exercises_view", whenMatched: "replace" } },
  ]).toArray();

export interface IWorkoutExercisesView {
  userId: string;
  exerciseId: number;
  exerciseCount: number;
  workedOutAt: Date;
}

export const WorkoutExercisesView = proxyCollection<IWorkoutExercisesView>(
  "workout_exercises_view",
);

export const getAllWorkoutExercises = async (user: Session["user"]) => {
  await WorkoutExercisesView.createIndexes([{ key: { userId: 1 } }]);

  return (await WorkoutExercisesView.find({ userId: user.id }).toArray()).map(
    ({ _id, ...location }) => ({ ...location, _id: _id.toString() }),
  );
};

export async function calculateFlashRateByMonth(userId: string, now: Date) {
  const months = eachMonthOfInterval({
    start: startOfMonth(subYears(now, 2)),
    end: endOfMonth(now),
  });

  const flashRateByMonth: unknown[] = [];
  for (const month of months) {
    const monthKey = month.toISOString().slice(0, 7); // YYYY-MM

    const workout = await MaterializedWorkoutsView.aggregate<{
      workedOutAt: Date;
      exercise: WorkoutExercise;
      location: LocationData;
    }>([
      {
        $match: {
          userId,
          "exercises.exerciseId": 2001,
          workedOutAt: { $gte: startOfMonth(month), $lt: endOfMonth(month) },
          deletedAt: { $exists: false },
        },
      },
      { $sort: { workedOutAt: -1 } },
      { $addFields: { locationId: { $toObjectId: "$locationId" } } },
      {
        $lookup: {
          from: "locations",
          localField: "locationId",
          foreignField: "_id",
          as: "location",
        },
      },
      { $set: { location: { $first: "$location" } } },
      {
        $project: {
          _id: 0,
          location: 1,
          workedOutAt: 1,
          exercise: {
            $first: {
              $filter: {
                input: "$exercises",
                as: "exercise",
                cond: { $eq: ["$$exercise.exerciseId", 2001] },
              },
            },
          },
        },
      },
    ]).toArray();

    const gradePredicate = (
      set: WorkoutExerciseSet & { location: LocationData },
    ) => {
      console.log({ set });
      const inputGrade = getSetGrade(set, set.location);
      if (inputGrade) return inputGrade >= 6.67 && inputGrade < 6.83;
    };

    const sets = workout
      .flatMap((w) =>
        (w.exercise.sets || []).map((set) => ({
          ...set,
          location: w.location,
        })),
      )
      .filter(gradePredicate);

    const sendSets = sets.filter(
      (set) =>
        set.inputs[2]?.value === SendType.Flash ||
        set.inputs[2]?.value === SendType.Top,
    );
    const flashSets = sendSets.filter(
      (set) => set.inputs[2]?.value === SendType.Flash,
    );

    flashRateByMonth.push({
      month: monthKey,
      totalSets: sets.length,
      sendSets: sendSets.length,
      flashSets: flashSets.length,
      flashRate: (flashSets.length / sendSets.length).toLocaleString("en-US", {
        style: "percent",
      }),
    });
  }

  console.table(flashRateByMonth);
}
