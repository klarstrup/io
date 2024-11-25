import { subMonths, subYears } from "date-fns";
import type { WithId } from "mongodb";
import type { Session } from "next-auth";
import { getDB } from "../dbConnect";
import type { PRType } from "../lib";
import { exerciseIdsThatICareAbout } from "../sources/fitocracy";
import { proxyCollection } from "../utils.server";
import { exercises, InputType } from "./exercises";
import {
  isClimbingExercise,
  type WorkoutData,
  type WorkoutExerciseSet,
} from "./workout";

export const Workouts = proxyCollection<Omit<WorkoutData, "id">>("workouts");

export const MaterializedWorkoutsView = proxyCollection<WorkoutData>(
  "materialized_workouts_view",
);

const DEADLIFT_ID = 3;
const WORKING_SET_REPS = 5;
const WORKING_SETS = 3;
const WORKING_SETS_FOR_DEADLIFT = 1;
const WEIGHT_INCREMENT = 1.25;
const WEIGHT_INCREMENT_FOR_LEGS = 2.5;
const FAILURE_DELOAD_FACTOR = 0.9;

export async function getNextSets({
  user,
  to,
}: {
  user: Session["user"];
  to: Date;
}) {
  return (
    await Promise.all(
      exerciseIdsThatICareAbout.map(
        async (exerciseId) =>
          [
            exerciseId,
            await MaterializedWorkoutsView.findOne(
              {
                userId: user.id,
                "exercises.exerciseId": exerciseId,
                workedOutAt: { $lte: to },
              },
              { sort: { workedOutAt: -1 } },
            ),
          ] as const,
      ),
    )
  )
    .map(([id, workout]) => {
      if (isClimbingExercise(id)) {
        return {
          workedOutAt: workout?.workedOutAt || null,
          exerciseId: id,
          successful: true,
          nextWorkingSets: NaN,
          nextWorkingSetsReps: NaN,
          nextWorkingSetsWeight: NaN,
        };
      }

      const exercise = workout?.exercises.find(
        ({ exerciseId }) => exerciseId === id,
      );
      const exerciseDefinition = exercises.find((ex) => ex.id === id)!;
      const weightInputIndex = exerciseDefinition.inputs.findIndex(
        ({ type }) => type === InputType.Weight,
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
          setWeight > accWeight &&
          setReps >= WORKING_SET_REPS
          ? set
          : acc;
      }, exercise.sets[0]);

      const workingSets =
        heaviestSet &&
        exercise?.sets.filter(
          (set) =>
            set.inputs[weightInputIndex]?.value ===
            heaviestSet.inputs[weightInputIndex]?.value,
        );

      const successful =
        workingSets &&
        (workingSets.length >= WORKING_SETS ||
          (id === DEADLIFT_ID &&
            workingSets.length >= WORKING_SETS_FOR_DEADLIFT)) &&
        workingSets.every(
          (sets) =>
            sets.inputs[repsInputIndex] &&
            sets.inputs[repsInputIndex].value >= WORKING_SET_REPS,
        );
      const goalWeight = heaviestSet
        ? successful
          ? ([1, 183, 474, 532].includes(id)
              ? WEIGHT_INCREMENT
              : WEIGHT_INCREMENT_FOR_LEGS) +
            (heaviestSet?.inputs[weightInputIndex]?.value || 0)
          : FAILURE_DELOAD_FACTOR *
            (heaviestSet?.inputs[weightInputIndex]?.value || 0)
        : 20;

      return {
        workedOutAt: workout?.workedOutAt || null,
        exerciseId: id,
        successful,
        nextWorkingSets: id === DEADLIFT_ID ? 1 : 3,
        nextWorkingSetsReps: WORKING_SET_REPS,
        nextWorkingSetsWeight:
          String(goalWeight).endsWith(".25") ||
          String(goalWeight).endsWith(".75")
            ? String(goalWeight).endsWith("2.25") ||
              String(goalWeight).endsWith("4.75")
              ? goalWeight + 0.25
              : goalWeight - 0.25
            : goalWeight,
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
      .collection<WorkoutData>("workouts")
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

export const updateExerciseCounts = async (
  userId: Session["user"]["id"],
  fitocracyUserId?: Session["user"]["fitocracyUserId"],
) =>
  await getDB().then((db) =>
    db
      .collection<WorkoutData>("workouts")
      .aggregate([
        {
          $unionWith: {
            coll: "fitocracy_workouts",
            pipeline: [
              { $match: { user_id: fitocracyUserId } },
              { $set: { workedOutAt: "$workout_timestamp" } },
              {
                $set: {
                  exercises: {
                    $map: {
                      input: "$root_group.children.exercise",
                      as: "exercise",
                      in: { exerciseId: "$$exercise.exercise_id" },
                    },
                  },
                },
              },
              {
                $replaceWith: {
                  $setField: {
                    field: "userId",
                    input: "$$ROOT",
                    value: userId,
                  },
                },
              },
            ],
          },
        },
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
