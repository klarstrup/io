import { subMonths, subYears } from "date-fns";
import type { WithId } from "mongodb";
import type { Session } from "next-auth";
import { getDB } from "../dbConnect";
import type { PRType } from "../lib";
import { proxyCollection } from "../utils.server";
import { exercises, InputType, TagType } from "./exercises";
import {
  isClimbingExercise,
  type WorkoutData,
  type WorkoutExerciseSet,
} from "./workout";

export const Workouts = proxyCollection<Omit<WorkoutData, "id">>("workouts");

export const MaterializedWorkoutsView = proxyCollection<WorkoutData>(
  "materialized_workouts_view",
);

export async function getNextSets({
  user,
  to,
}: {
  user: Session["user"];
  to: Date;
}) {
  return (
    await Promise.all(
      (user.exerciseSchedules || [])
        .filter((scheduleEntry) => scheduleEntry.enabled)
        .map(
          async (scheduleEntry) =>
            [
              scheduleEntry,
              await MaterializedWorkoutsView.findOne(
                {
                  userId: user.id,
                  "exercises.exerciseId": scheduleEntry.exerciseId,
                  workedOutAt: { $lte: to },
                },
                { sort: { workedOutAt: -1 } },
              ),
            ] as const,
        ),
    )
  )
    .map(([scheduleEntry, workout]) => {
      if (isClimbingExercise(scheduleEntry.exerciseId)) {
        return {
          workedOutAt: workout?.workedOutAt || null,
          exerciseId: scheduleEntry.exerciseId,
          successful: true,
          nextWorkingSets: NaN,
          nextWorkingSetsReps: NaN,
          nextWorkingSetsWeight: NaN,
          scheduleEntry,
        };
      }

      const exercise = workout?.exercises.find(
        ({ exerciseId }) => exerciseId === scheduleEntry.exerciseId,
      );
      const exerciseDefinition = exercises.find(
        (ex) => ex.id === scheduleEntry.exerciseId,
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
            (set) => set.inputs[weightInputIndex]?.value === heaviestSetWeight,
          )) ||
        null;
      const successful =
        workingSets &&
        scheduleEntry.workingSets &&
        scheduleEntry.workingReps &&
        workingSets.length >= scheduleEntry.workingSets &&
        workingSets.every(
          (sets) =>
            sets.inputs[repsInputIndex] &&
            sets.inputs[repsInputIndex].value >= scheduleEntry.workingReps!,
        );

      const finalWorkingSetReps =
        workingSets?.[workingSets.length - 1]?.inputs[repsInputIndex]?.value;

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

      if (exercise?.exerciseId === 288) {
        console.log({
          workingSets,
          heaviestSetWeight,
          exercise,
          scheduleEntry,
          goalWeight,
          successful,
        });
      }
      return {
        workedOutAt: workout?.workedOutAt || null,
        exerciseId: scheduleEntry.exerciseId,
        successful,
        nextWorkingSets: scheduleEntry.workingSets,
        nextWorkingSetsReps: scheduleEntry.workingReps,
        nextWorkingSetsWeight: goalWeight
          ? // Barbell exercises use two plates so not all subdivisions are possible
            exerciseDefinition.tags?.find(
              (tag) => tag.name === "Barbell" && tag.type === TagType.Equipment,
            ) && Math.abs(goalWeight - Math.round(goalWeight)) < 0.5
            ? Math.round(goalWeight)
            : goalWeight
          : goalWeight,
        scheduleEntry,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        (a.workedOutAt?.getTime() || 0) - (b.workedOutAt?.getTime() || 0),
    );
}

export const noPR = {
  allTimePR: false,
  oneYearPR: false,
  threeMonthPR: false,
} satisfies Record<PRType, boolean>;

export function getIsSetPR(
  date: Date,
  workout: WorkoutData,
  precedingWorkouts: WithId<WorkoutData>[],
  exerciseId: WorkoutData["exercises"][number]["exerciseId"],
  set: WorkoutExerciseSet,
) {
  const exercise = exercises.find((e) => e.id === exerciseId);
  if (!exercise) return noPR;

  const inputValues = set.inputs.map((input) => input.value || 0);
  const inputTypes = exercise.inputs.map((input) => input.type);
  const now1YearAgo = subYears(date, 1);
  const now3MonthsAgo = subMonths(date, 3);
  let allTimePR = true;
  let oneYearPR = true;
  let threeMonthPR = true;
  for (const precedingWorkout of precedingWorkouts) {
    for (const workoutExercise of precedingWorkout.exercises) {
      if (workoutExercise.exerciseId !== exerciseId) continue;

      setLoop: for (const { inputs } of workoutExercise.sets) {
        for (const [index, { value }] of inputs.entries()) {
          const inputType = inputTypes[index]!;
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

  for (const workoutExercise of workout.exercises) {
    if (workoutExercise.exerciseId !== exerciseId) continue;

    setLoop: for (const exerciseSet of workoutExercise.sets) {
      // Optimistic identity check
      if (exerciseSet === set) break;

      for (const [index, { value }] of exerciseSet.inputs.entries()) {
        const inputType = inputTypes[index]!;
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

      if (workout.workedOutAt > now1YearAgo) {
        oneYearPR = false;
      }

      if (workout.workedOutAt > now3MonthsAgo) {
        threeMonthPR = false;
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
  await getDB().then((db) =>
    db
      .collection<WorkoutData>("materialized_workouts_view")
      .aggregate([
        { $match: { userId, location: { $exists: true, $ne: null } } },
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
      ])
      .toArray(),
  );

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
  await getDB().then((db) =>
    db
      .collection<WorkoutData>("materialized_workouts_view")
      .aggregate([
        { $match: { userId } },
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
      ])
      .toArray(),
  );

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
