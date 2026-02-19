/* eslint-disable no-unexpected-multiline */
import { tz } from "@date-fns/tz";
import {
  addHours,
  addMilliseconds,
  isEqual,
  max,
  startOfDay,
  subDays,
  subMonths,
  subQuarters,
  subYears,
} from "date-fns";
import { ObjectId, type WithId } from "mongodb";
import type { Session } from "next-auth";
import type { Location } from "../graphql.generated";
import type { PRType } from "../lib";
import type { ExerciseSchedule } from "../sources/fitocracy";
import { dayStartHour, epoch } from "../utils";
import { proxyCollection } from "../utils.server";
import { exercisesById } from "./exercises";
import {
  AssistType,
  InputType,
  SendType,
  TagType,
  Unit,
} from "./exercises.types";
import type { LocationData } from "./location";
import {
  durationToMs,
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

export const getNextSet = async ({
  userId,
  exerciseSchedule,
}: {
  userId: Session["user"]["id"];
  exerciseSchedule: ExerciseSchedule;
}) => {
  const id = `next-${exerciseSchedule.id}` as const;
  const [workout] = await MaterializedWorkoutsView.aggregate<{
    workedOutAt: Date;
    exercise: WorkoutExercise;
  }>([
    {
      $match: {
        userId,
        "exercises.exerciseId": exerciseSchedule.exerciseId,
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
                $eq: ["$$exercise.exerciseId", exerciseSchedule.exerciseId],
              },
            },
          },
        },
      },
    },
  ]).toArray();

  // Historical workouts may have workedOutAt timestamps that are not adjusted for dayStartHour, so adjust them here for the purpose of calculating due dates
  const adjustedWorkedOutAt =
    workout &&
    (isEqual(
      workout.workedOutAt,
      startOfDay(workout.workedOutAt, { in: tz("UTC") }),
    )
      ? addHours(workout.workedOutAt, dayStartHour)
      : workout.workedOutAt);

  const lastSetEndedAt =
    workout &&
    max(
      [
        ...workout.exercise.sets.flatMap((set) => [
          set.createdAt,
          set.updatedAt,
        ]),
        // Fallback if no sets have timestamps for some reason
        adjustedWorkedOutAt,
      ].filter(Boolean),
    );

  let dueOn = addMilliseconds(
    lastSetEndedAt || epoch,
    durationToMs(exerciseSchedule.frequency),
  );

  if (
    exerciseSchedule.snoozedUntil &&
    (!lastSetEndedAt || lastSetEndedAt < exerciseSchedule.snoozedUntil)
  ) {
    dueOn = exerciseSchedule.snoozedUntil;
  }

  // Due date cannot be in the past
  dueOn = max([dueOn, new Date()]);

  if (isClimbingExercise(exerciseSchedule.exerciseId)) {
    if (exerciseSchedule.workingSets && exerciseSchedule.workingSets > 0) {
      const workouts = MaterializedWorkoutsView.aggregate<{
        workedOutAt: Date;
        exercise: WorkoutExercise;
      }>([
        {
          $match: {
            userId,
            "exercises.exerciseId": exerciseSchedule.exerciseId,
            deletedAt: { $exists: false },
          },
        },
        { $sort: { workedOutAt: -1 } },
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
                    $eq: ["$$exercise.exerciseId", exerciseSchedule.exerciseId],
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
          successfulSets.length >= exerciseSchedule.workingSets;

        if (successful) {
          return {
            id,
            workedOutAt,
            dueOn,
            exerciseId: exerciseSchedule.exerciseId,
            successful: true,
            nextWorkingSets: exerciseSchedule.workingSets ?? null,
            nextWorkingSetInputs: [],
            exerciseSchedule,
          };
        }
      }
    }

    return {
      id,
      workedOutAt: workout?.workedOutAt || null,
      dueOn,
      exerciseId: exerciseSchedule.exerciseId,
      successful: true,
      nextWorkingSets: exerciseSchedule.workingSets ?? null,
      nextWorkingSetInputs: [],
      exerciseSchedule,
    };
  }

  const exercise = workout?.exercise;
  const exerciseDefinition = exercisesById.get(exerciseSchedule.exerciseId)!;
  let effortInputIndex = exerciseDefinition.inputs.findIndex(
    ({ type }) =>
      type === InputType.Weight ||
      type === InputType.Weightassist ||
      type === InputType.Time,
  );
  if (effortInputIndex === -1) {
    effortInputIndex = exerciseDefinition.inputs.findIndex(
      ({ type }) => type === InputType.Reps,
    );
  }
  const repsInputIndex = exerciseDefinition.inputs.findIndex(
    ({ type }) => type === InputType.Reps,
  );
  const heaviestSet = exercise?.sets.reduce((acc, set) => {
    const setReps = set.inputs[repsInputIndex]?.value;
    const setWeight = set.inputs[effortInputIndex]?.value;
    const accWeight = acc?.inputs[effortInputIndex]?.value;
    return setWeight &&
      setReps &&
      (!accWeight || setWeight > accWeight) &&
      (exerciseSchedule.workingReps
        ? setReps >= exerciseSchedule.workingReps
        : true)
      ? set
      : acc;
  }, exercise.sets[0]);

  let heaviestSetEffort =
    heaviestSet?.inputs[effortInputIndex]?.value || exerciseSchedule.baseWeight;

  const workingSets =
    (heaviestSetEffort !== undefined &&
      exercise?.sets.filter(
        ({ inputs }) => inputs[effortInputIndex]?.value === heaviestSetEffort,
      )) ||
    null;
  const successful =
    workingSets &&
    (exerciseSchedule.workingSets
      ? workingSets.length >= exerciseSchedule.workingSets
      : true) &&
    (exerciseSchedule.workingReps
      ? !exerciseSchedule.workingSets &&
        workingSets.every(
          ({ inputs }) =>
            inputs.length === 1 &&
            inputs.every(({ unit }) => unit === Unit.Reps),
        )
        ? workingSets.reduce((m, s) => m + s.inputs[0]!.value, 0) >=
          exerciseSchedule.workingReps
        : workingSets.every(
            ({ inputs }) =>
              inputs[repsInputIndex] &&
              inputs[repsInputIndex].value >= exerciseSchedule.workingReps!,
          )
      : true);

  if (
    !exerciseSchedule.workingSets &&
    workingSets?.every(
      ({ inputs }) =>
        inputs.length === 1 && inputs.every(({ unit }) => unit === Unit.Reps),
    )
  ) {
    heaviestSetEffort = workingSets.reduce(
      (m, s) => m + Number(s.inputs[0]!.value),
      0,
    );
  }

  const finalWorkingSetReps =
    workingSets?.[workingSets.length - 1]?.inputs[repsInputIndex]?.value;

  const totalReps = exercise?.sets?.reduce(
    (m, s) => m + Number(s.inputs[repsInputIndex]?.value || 0),
    0,
  );

  const goalEffort = exerciseSchedule.increment
    ? heaviestSetEffort !== undefined && heaviestSetEffort !== null
      ? successful
        ? !exerciseSchedule.workingSets &&
          !exerciseSchedule.workingReps &&
          effortInputIndex === repsInputIndex &&
          totalReps
          ? totalReps + exerciseSchedule.increment
          : finalWorkingSetReps &&
              exerciseSchedule.workingReps &&
              finalWorkingSetReps >= exerciseSchedule.workingReps * 2
            ? exerciseSchedule.increment * 2 + heaviestSetEffort
            : exerciseSchedule.increment + heaviestSetEffort
        : exerciseSchedule.deloadFactor
          ? exerciseSchedule.deloadFactor * heaviestSetEffort
          : exerciseSchedule.baseWeight
      : exerciseSchedule.baseWeight
    : null;

  const nextWorkingSetsEffort = goalEffort
    ? // Barbell exercises use two plates so not all subdivisions are possible
      exerciseDefinition.tags?.find(
        ({ name, type }) => name === "Barbell" && type === TagType.Equipment,
      ) && Math.abs(goalEffort - Math.round(goalEffort)) < 0.5
      ? Math.round(goalEffort)
      : goalEffort
    : goalEffort;

  let nextWorkingSetInputs: WorkoutExerciseSetInput[] | null =
    exerciseDefinition.inputs.map(
      ({ type, metric_unit }, inputIndex): WorkoutExerciseSetInput =>
        nextWorkingSetsEffort && inputIndex === effortInputIndex
          ? {
              value: nextWorkingSetsEffort,
              unit: exercise?.sets[0]?.inputs[inputIndex]?.unit || metric_unit,
            }
          : exerciseSchedule.workingReps && type === InputType.Reps
            ? {
                value:
                  exerciseSchedule.workingReps ?? exerciseSchedule.baseWeight,
                unit: Unit.Reps,
              }
            : { value: NaN },
    );

  const nextWorkingSets = exerciseSchedule.workingSets ?? null;

  if (
    nextWorkingSetInputs.every(({ value }) => Number.isNaN(value)) &&
    !nextWorkingSets
  ) {
    nextWorkingSetInputs = null;
  }

  return {
    id,
    workedOutAt: workout?.workedOutAt || null,
    dueOn,
    exerciseId: exerciseSchedule.exerciseId,
    successful,
    nextWorkingSetInputs,
    nextWorkingSets,
    exerciseSchedule,
  };
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
  const exercise = exercisesById.get(exerciseId);
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

export const updateExerciseCounts = async (userId: Session["user"]["id"]) => {
  // Calculcate quarterly and monthly frequency
  const now = new Date();
  const oneMonthAgo = subMonths(now, 1);
  const oneQuarterAgo = subQuarters(now, 1);

  await MaterializedWorkoutsView.aggregate([
    { $match: { userId, deletedAt: { $exists: false } } },
    { $unwind: "$exercises" },
    {
      $group: {
        _id: { exerciseId: "$exercises.exerciseId", userId },
        exerciseId: { $first: "$exercises.exerciseId" },
        userId: { $first: "$userId" },
        exerciseCount: { $count: {} },
        workedOutAt: { $max: "$workedOutAt" },
        monthlyCount: {
          $sum: {
            $cond: [{ $gte: ["$workedOutAt", oneMonthAgo] }, 1, 0],
          },
        },
        quarterlyCount: {
          $sum: {
            $cond: [{ $gte: ["$workedOutAt", oneQuarterAgo] }, 1, 0],
          },
        },
      },
    },
    {
      $replaceWith: {
        $setField: { field: "userId", input: "$$ROOT", value: userId },
      },
    },
    { $merge: { into: "workout_exercises_view" } },
  ]).toArray();
};

export interface IWorkoutExercisesView {
  userId: string;
  exerciseId: number;
  exerciseCount: number;
  workedOutAt: Date;
  monthlyCount: number;
  quarterlyCount: number;
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

export const calculate60dayTop10AverageSendGrade = (
  allBoulderingWorkouts: WithId<WorkoutData>[],
  locations: WithId<LocationData>[],
  date: Date,
) => {
  const workouts = allBoulderingWorkouts.filter(
    (w) => w.workedOutAt <= date && w.workedOutAt > subDays(date, 60),
  );
  const grades = workouts
    .flatMap((w) => {
      const location = locations.find((l) => l._id.toString() === w.locationId);
      return w.exercises
        .filter((e) => isClimbingExercise(e.exerciseId))
        .flatMap((e) =>
          e.sets
            .filter(
              (s) =>
                (s.inputs[2]?.value as SendType) === SendType.Top ||
                (s.inputs[2]?.value as SendType) === SendType.Flash,
            )
            .map((set) => getSetGrade(set, location as unknown as Location)),
        );
    })
    .filter((grade): grade is number => typeof grade === "number" && grade > 0)
    .sort((a, b) => b - a);

  if (!grades.length) return null;

  return grades.slice(0, 10).reduce((sum, grade) => sum + grade, 0) / 10;
};

export const calculate60dayTop10AverageFlashGrade = (
  allBoulderingWorkouts: WithId<WorkoutData>[],
  locations: WithId<LocationData>[],
  date: Date,
) => {
  const workouts = allBoulderingWorkouts.filter(
    (w) => w.workedOutAt <= date && w.workedOutAt > subDays(date, 60),
  );

  const grades = workouts
    .flatMap((w) => {
      const location = locations.find((l) => l._id.toString() === w.locationId);
      return w.exercises
        .filter((e) => isClimbingExercise(e.exerciseId))
        .flatMap((e) =>
          e.sets
            .filter((s) => (s.inputs[2]?.value as SendType) === SendType.Flash)
            .map((set) => getSetGrade(set, location as unknown as Location)),
        );
    })
    .filter((grade): grade is number => typeof grade === "number" && grade > 0)
    .sort((a, b) => b - a);

  if (!grades.length) return null;

  return grades.slice(0, 10).reduce((sum, grade) => sum + grade, 0) / 10;
};

export const calculate60dayTop10AverageAttemptGrade = (
  allBoulderingWorkouts: WithId<WorkoutData>[],
  locations: WithId<LocationData>[],
  date: Date,
) => {
  const workouts = allBoulderingWorkouts.filter(
    (w) => w.workedOutAt <= date && w.workedOutAt > subDays(date, 60),
  );

  const grades = workouts
    .flatMap((w) => {
      const location = locations.find((l) => l._id.toString() === w.locationId);
      return w.exercises
        .filter((e) => isClimbingExercise(e.exerciseId))
        .flatMap((e) =>
          e.sets
            .filter(
              (s) => (s.inputs[2]?.value as SendType) === SendType.Attempt,
            )
            .map((set) => getSetGrade(set, location as unknown as Location)),
        );
    })
    .filter((grade): grade is number => typeof grade === "number" && grade > 0)
    .sort((a, b) => b - a);

  if (!grades.length) return null;

  return grades.slice(0, 10).reduce((sum, grade) => sum + grade, 0) / 10;
};

export function mergeWorkoutsOfExercise(
  workouts: WithId<WorkoutData>[],
  userId: string,
  locations?: WithId<LocationData>[] | null,
) {
  return workouts.reduce<WithId<WorkoutData>>(
    (acc, workout) => {
      const location = workout.locationId
        ? locations?.find((l) => l._id.toString() === workout.locationId)
        : workout.location
          ? locations?.find((l) => l.name === workout.location)
          : undefined;

      for (const exercise of workout.exercises) {
        const existingExercise = acc.exercises.find(
          (e) => e.exerciseId === exercise.exerciseId,
        );

        let reversedSets = [...exercise.sets].reverse();

        if (exercise.exerciseId === 2001) {
          reversedSets = reversedSets.map((set) => ({
            ...set,
            inputs: set.inputs.map((input, index) =>
              index === 0
                ? {
                    ...input,
                    value:
                      input.value ??
                      getSetGrade(set, location as unknown as Location),
                  }
                : input,
            ),
          }));
        }

        if (existingExercise) {
          existingExercise.sets.push(...reversedSets);
        } else {
          acc.exercises.push({ ...exercise, sets: reversedSets });
          acc.workedOutAt =
            workout.workedOutAt > acc.workedOutAt
              ? workout.workedOutAt
              : acc.workedOutAt;
        }
      }

      return acc;
    },
    {
      _id: new ObjectId(),
      id: new ObjectId().toString(),
      workedOutAt: new Date(),
      exercises: [],
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  );
}
