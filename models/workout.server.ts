import { subMonths, subYears } from "date-fns";
import type { WithId } from "mongodb";
import type { Session } from "next-auth";
import type { PRType } from "../lib";
import { proxyCollection } from "../utils.server";
import { AssistType, exercises, InputType, TagType } from "./exercises";
import {
  isClimbingExercise,
  type WorkoutData,
  type WorkoutExerciseSet,
} from "./workout";

export const Workouts = proxyCollection<Omit<WorkoutData, "id">>("workouts");

export const MaterializedWorkoutsView = proxyCollection<WorkoutData>(
  "materialized_workouts_view",
);

export const getNextSets = async ({
  user,
  to,
}: {
  user: Session["user"];
  to: Date;
}) =>
  (
    await Promise.all(
      (user.exerciseSchedules || [])
        .filter((scheduleEntry) => scheduleEntry.enabled)
        .map(async (scheduleEntry) => {
          const workout = await MaterializedWorkoutsView.findOne(
            {
              userId: user.id,
              "exercises.exerciseId": scheduleEntry.exerciseId,
              workedOutAt: { $lte: to },
              deletedAt: { $exists: false },
            },
            { sort: { workedOutAt: -1 } },
          );

          if (isClimbingExercise(scheduleEntry.exerciseId)) {
            if (scheduleEntry.workingSets && scheduleEntry.workingSets > 0) {
              const workouts = await MaterializedWorkoutsView.find(
                {
                  userId: user.id,
                  "exercises.exerciseId": scheduleEntry.exerciseId,
                  workedOutAt: { $lte: to },
                  deletedAt: { $exists: false },
                },
                { sort: { workedOutAt: -1 } },
              ).toArray();
              for (const workout of workouts) {
                const exercise = workout.exercises.find(
                  ({ exerciseId }) => exerciseId === scheduleEntry.exerciseId,
                )!;
                const successful =
                  exercise?.sets.length >= scheduleEntry.workingSets;

                if (successful) {
                  return {
                    workedOutAt: workout.workedOutAt,
                    exerciseId: scheduleEntry.exerciseId,
                    successful: true,
                    nextWorkingSets: scheduleEntry.workingSets,
                    nextWorkingSetsReps: NaN,
                    nextWorkingSetsWeight: NaN,
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
              nextWorkingSetsReps: NaN,
              nextWorkingSetsWeight: NaN,
              scheduleEntry,
            };
          }

          const exercise = workout?.exercises.find(
            ({ exerciseId }) => exerciseId === scheduleEntry.exerciseId,
          );
          const exerciseDefinition = exercises.find(
            ({ id }) => id === scheduleEntry.exerciseId,
          )!;
          const weightInputIndex = exerciseDefinition.inputs.findIndex(
            ({ type }) =>
              type === InputType.Weight || type === InputType.Weightassist,
          );
          const repsInputIndex = exerciseDefinition.inputs.findIndex(
            ({ type }) => type === InputType.Reps,
          );
          const heaviestSet = exercise?.sets.reduce((acc, set) => {
            const setReps = set.inputs[repsInputIndex]?.value;
            const setWeight = set.inputs[weightInputIndex]?.value;
            const accWeight = acc?.inputs[weightInputIndex]?.value;
            return setWeight &&
              accWeight &&
              setReps &&
              scheduleEntry.workingReps &&
              setWeight > accWeight &&
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

          return {
            workedOutAt: workout?.workedOutAt || null,
            exerciseId: scheduleEntry.exerciseId,
            successful,
            nextWorkingSets: scheduleEntry.workingSets,
            nextWorkingSetsReps: scheduleEntry.workingReps,
            nextWorkingSetsWeight: goalWeight
              ? // Barbell exercises use two plates so not all subdivisions are possible
                exerciseDefinition.tags?.find(
                  ({ name, type }) =>
                    name === "Barbell" && type === TagType.Equipment,
                ) && Math.abs(goalWeight - Math.round(goalWeight)) < 0.5
                ? Math.round(goalWeight)
                : goalWeight
              : goalWeight,
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
  const exercise = exercises.find((e) => e.id === exerciseId);
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
            inputType === InputType.Pace || inputType === InputType.Time
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
  await WorkoutExercisesView.aggregate([
    {
      $match: {
        userId,
        location: { $exists: true, $ne: null },
        deletedAt: { $exists: false },
      },
    },
    {
      $group: {
        _id: { location: "$location", userId: "$userId" },
        location: { $first: "$location" },
        userId: { $first: "$userId" },
        visitCount: { $count: {} },
        mostRecentVisit: { $max: "$workedOutAt" },
      },
    },
    { $merge: { into: "workout_locations_view", whenMatched: "replace" } },
  ]).toArray();

export interface IWorkoutLocationsView {
  location: string;
  userId: string;
  visitCount?: number;
  mostRecentVisit: Date | null;
}

export const WorkoutLocationsView = proxyCollection<IWorkoutLocationsView>(
  "workout_locations_view",
);

export const getAllWorkoutLocations = async (user: Session["user"]) =>
  (await WorkoutLocationsView.find({ userId: user.id }).toArray()).map(
    (location) => ({
      ...location,
      _id: location._id.toString(),
    }),
  );

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

export const getAllWorkoutExercises = async (user: Session["user"]) =>
  (await WorkoutExercisesView.find({ userId: user.id }).toArray()).map(
    (location) => ({
      ...location,
      _id: location._id.toString(),
    }),
  );
