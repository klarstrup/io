import { tz } from "@date-fns/tz";
import {
  addHours,
  addQuarters,
  isEqual,
  isFuture,
  max,
  startOfDay,
  subDays,
  subMonths,
  subQuarters,
  subYears,
} from "date-fns";
import { ObjectId, type WithId } from "mongodb";
import type { Session } from "next-auth";
import type { GQLocation } from "../graphql.generated";
import type { PRType } from "../lib";
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
import type { ITodoScheduleWithExerciseProgram } from "./user";
import {
  addDurationToDate,
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

export type NextSetResult = {
  id: `next-${string}`;
  lastWorkedOutAt: Date | null;
  dueOn: Date;
  exerciseId: number;
  successful: boolean;
  nextWorkingSets: number | null;
  nextWorkingSetInputs: WorkoutExerciseSetInput[] | null;
  exerciseSchedule: ITodoScheduleWithExerciseProgram;
};

/** Pure computation: given a workout (or null) and schedule, returns the next set result. Caller must pass the correct workout (e.g. first successful for climbing). */
export function computeNextSetFromWorkout(
  workout: { workedOutAt: Date; exercise: WorkoutExercise } | null,
  exerciseSchedule: ITodoScheduleWithExerciseProgram,
): NextSetResult {
  const id = `next-${exerciseSchedule.id}` as const;

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
        adjustedWorkedOutAt,
      ].filter(Boolean),
    );

  let dueOn = addDurationToDate(
    lastSetEndedAt || epoch,
    exerciseSchedule.frequency,
  );

  if (
    exerciseSchedule.snoozedUntil &&
    isFuture(exerciseSchedule.snoozedUntil) &&
    (!lastSetEndedAt || lastSetEndedAt < exerciseSchedule.snoozedUntil)
  ) {
    dueOn = exerciseSchedule.snoozedUntil;
  }

  dueOn = max([dueOn, new Date()]);

  if (isClimbingExercise(exerciseSchedule.exerciseProgram.exerciseId)) {
    if (
      exerciseSchedule.exerciseProgram.workingSets &&
      exerciseSchedule.exerciseProgram.workingSets > 0 &&
      workout
    ) {
      const successfulSets = workout.exercise.sets.filter(
        (set) =>
          (set.inputs[2]?.value as SendType) === SendType.Flash ||
          (set.inputs[2]?.value as SendType) === SendType.Top ||
          (set.inputs[2]?.value as SendType) === SendType.Repeat,
      );
      const successful =
        successfulSets.length >= exerciseSchedule.exerciseProgram.workingSets;
      return {
        id,
        lastWorkedOutAt: workout.workedOutAt,
        dueOn,
        exerciseId: exerciseSchedule.exerciseProgram.exerciseId,
        successful,
        nextWorkingSets: exerciseSchedule.exerciseProgram.workingSets ?? null,
        nextWorkingSetInputs: [],
        exerciseSchedule,
      };
    }

    return {
      id,
      lastWorkedOutAt: workout?.workedOutAt ?? null,
      dueOn,
      exerciseId: exerciseSchedule.exerciseProgram.exerciseId,
      successful: true,
      nextWorkingSets: exerciseSchedule.exerciseProgram.workingSets ?? null,
      nextWorkingSetInputs: [],
      exerciseSchedule: {
        ...exerciseSchedule,
        ...exerciseSchedule.exerciseProgram,
      },
    };
  }

  const exercise = workout?.exercise;
  const exerciseDefinition = exercisesById.get(
    exerciseSchedule.exerciseProgram.exerciseId,
  )!;
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
  const heaviestSet = (exercise?.sets ?? []).reduce((acc, set) => {
    const setReps = set.inputs[repsInputIndex]?.value;
    const setWeight = set.inputs[effortInputIndex]?.value;
    const accWeight = acc?.inputs[effortInputIndex]?.value;
    return setWeight &&
      setReps &&
      (!accWeight || setWeight > accWeight) &&
      (exerciseSchedule.exerciseProgram.workingReps
        ? setReps >= exerciseSchedule.exerciseProgram.workingReps
        : true)
      ? set
      : acc;
  }, exercise?.sets?.[0]);

  let heaviestSetEffort =
    heaviestSet?.inputs[effortInputIndex]?.value ??
    exerciseSchedule.exerciseProgram.baseWeight;

  const workingSets =
    (heaviestSetEffort !== undefined &&
      exercise?.sets.filter(
        ({ inputs }) => inputs[effortInputIndex]?.value === heaviestSetEffort,
      )) ||
    null;
  const successful =
    workingSets &&
    (exerciseSchedule.exerciseProgram.workingSets
      ? workingSets.length >= exerciseSchedule.exerciseProgram.workingSets
      : true) &&
    (exerciseSchedule.exerciseProgram.workingReps
      ? !exerciseSchedule.exerciseProgram.workingSets &&
        workingSets.every(
          ({ inputs }) =>
            inputs.length === 1 &&
            inputs.every(({ unit }) => unit === Unit.Reps),
        )
        ? workingSets.reduce((m, s) => m + s.inputs[0]!.value, 0) >=
          exerciseSchedule.exerciseProgram.workingReps
        : workingSets.every(
            ({ inputs }) =>
              inputs[repsInputIndex] &&
              inputs[repsInputIndex].value >=
                exerciseSchedule.exerciseProgram.workingReps!,
          )
      : true);

  if (
    !exerciseSchedule.exerciseProgram.workingSets &&
    workingSets?.every(
      ({ inputs }) =>
        inputs.length === 1 && inputs.every(({ unit }) => unit === Unit.Reps),
    )
  ) {
    heaviestSetEffort = workingSets.reduce((m, s) => m + s.inputs[0]!.value, 0);
  }

  const finalWorkingSetReps =
    workingSets?.[workingSets.length - 1]?.inputs[repsInputIndex]?.value;

  const totalReps = exercise?.sets?.reduce(
    (m, s) => m + (s.inputs[repsInputIndex]?.value || 0),
    0,
  );

  const goalEffort = exerciseSchedule.exerciseProgram.increment
    ? heaviestSetEffort !== undefined && heaviestSetEffort !== null
      ? successful
        ? !exerciseSchedule.exerciseProgram.workingSets &&
          !exerciseSchedule.exerciseProgram.workingReps &&
          effortInputIndex === repsInputIndex &&
          totalReps
          ? totalReps + exerciseSchedule.exerciseProgram.increment
          : finalWorkingSetReps &&
              exerciseSchedule.exerciseProgram.workingReps &&
              finalWorkingSetReps >=
                exerciseSchedule.exerciseProgram.workingReps * 2
            ? exerciseSchedule.exerciseProgram.increment * 2 + heaviestSetEffort
            : exerciseSchedule.exerciseProgram.increment + heaviestSetEffort
        : exerciseSchedule.exerciseProgram.deloadFactor
          ? exerciseSchedule.exerciseProgram.deloadFactor * heaviestSetEffort
          : exerciseSchedule.exerciseProgram.baseWeight
      : exerciseSchedule.exerciseProgram.baseWeight
    : null;

  const nextWorkingSetsEffort = goalEffort
    ? exerciseDefinition.tags?.find(
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
          : exerciseSchedule.exerciseProgram.workingReps &&
              type === InputType.Reps
            ? {
                value:
                  exerciseSchedule.exerciseProgram.workingReps ??
                  exerciseSchedule.exerciseProgram.baseWeight,
                unit: Unit.Reps,
              }
            : { value: NaN },
    );

  const nextWorkingSets = exerciseSchedule.exerciseProgram.workingSets ?? null;

  if (
    nextWorkingSetInputs.every(({ value }) => Number.isNaN(value)) &&
    !nextWorkingSets
  ) {
    nextWorkingSetInputs = null;
  }

  return {
    id,
    lastWorkedOutAt: workout?.workedOutAt ?? null,
    dueOn,
    exerciseId: exerciseSchedule.exerciseProgram.exerciseId,
    successful: successful ?? false,
    nextWorkingSetInputs,
    nextWorkingSets,
    exerciseSchedule,
  };
}

interface GetNextSetsDoc {
  exerciseId: number;
  workedOutAt: Date;
  exercise: WorkoutExercise;
}
export async function* getNextSets(
  userId: Session["user"]["id"],
  exerciseSchedules: ITodoScheduleWithExerciseProgram[],
  { asOf }: { asOf?: Date | null } = {},
) {
  const enabled = exerciseSchedules.filter((s) => s.enabled);
  if (enabled.length === 0) return [];

  const enabledExerciseIds = Array.from(
    new Set(enabled.map((s) => s.exerciseProgram.exerciseId)),
  );

  const mostRecentDocs = MaterializedWorkoutsView.aggregate<GetNextSetsDoc>([
    {
      $match: {
        workedOutAt: {
          $gte: addQuarters(new Date(), -1),
          $lte: asOf ?? new Date(),
        },
        userId,
        "exercises.exerciseId": { $in: enabledExerciseIds },
      },
    },
    { $sort: { workedOutAt: -1 } },
    { $unwind: "$exercises" },
    { $match: { "exercises.exerciseId": { $in: enabledExerciseIds } } },
    {
      $group: {
        _id: "$exercises.exerciseId",
        exerciseId: { $first: "$exercises.exerciseId" },
        workedOutAt: { $first: "$workedOutAt" },
        exercise: { $first: "$exercises" },
      },
    },
    { $project: { _id: 0, exerciseId: 1, workedOutAt: 1, exercise: 1 } },
  ]);

  const firstSuccessfulByScheduleId = new Map<string, GetNextSetsDoc>();
  const mostRecentByExerciseId = new Map<number, GetNextSetsDoc>();
  for await (const doc of mostRecentDocs) {
    for (const schedule of enabled.filter(
      (s) => s.exerciseProgram.exerciseId === doc.exerciseId,
    )) {
      if (
        isClimbingExercise(schedule.exerciseProgram.exerciseId) &&
        !firstSuccessfulByScheduleId.has(schedule.id) &&
        schedule.exerciseProgram.workingSets &&
        schedule.exerciseProgram.workingSets > 0
      ) {
        const climbingCursor =
          MaterializedWorkoutsView.aggregate<GetNextSetsDoc>([
            {
              $match: {
                userId,
                "exercises.exerciseId": schedule.exerciseProgram.exerciseId,
                deletedAt: { $exists: false },
              },
            },
            { $sort: { workedOutAt: -1 } },
            { $unwind: "$exercises" },
            {
              $match: {
                "exercises.exerciseId": schedule.exerciseProgram.exerciseId,
              },
            },
            {
              $project: {
                _id: 0,
                exerciseId: "$exercises.exerciseId",
                workedOutAt: 1,
                exercise: "$exercises",
              },
            },
          ]);
        for await (const doc of climbingCursor) {
          if (firstSuccessfulByScheduleId.has(schedule.id)) continue;
          const successfulSets = doc.exercise.sets.filter(
            (set) =>
              (set.inputs[2]?.value as SendType) === SendType.Flash ||
              (set.inputs[2]?.value as SendType) === SendType.Top ||
              (set.inputs[2]?.value as SendType) === SendType.Repeat,
          );
          if (
            schedule.exerciseProgram.workingSets &&
            successfulSets.length >= schedule.exerciseProgram.workingSets
          ) {
            firstSuccessfulByScheduleId.set(schedule.id, doc);
            break;
          }
        }
      } else {
        mostRecentByExerciseId.set(doc.exerciseId, doc);
      }

      const workout =
        (isClimbingExercise(schedule.exerciseProgram.exerciseId) &&
        schedule.exerciseProgram.workingSets != null &&
        schedule.exerciseProgram.workingSets > 0
          ? firstSuccessfulByScheduleId.get(schedule.id)
          : undefined) ??
        mostRecentByExerciseId.get(schedule.exerciseProgram.exerciseId);
      yield computeNextSetFromWorkout(workout ?? null, schedule);
    }
  }
}

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

  await WorkoutExercisesView.createIndexes([{ key: { userId: 1 } }]);

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

export const getAllWorkoutExercises = async (user: Session["user"]) =>
  (await WorkoutExercisesView.find({ userId: user.id }).toArray()).map(
    ({ _id, ...location }) => ({ ...location, _id: _id.toString() }),
  );

export const getWorkoutExercise = async (
  user: Session["user"],
  exerciseId: number,
) => await WorkoutExercisesView.findOne({ userId: user.id, exerciseId });

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
            .map((set) => getSetGrade(set, location as unknown as GQLocation)),
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
            .map((set) => getSetGrade(set, location as unknown as GQLocation)),
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
            .map((set) => getSetGrade(set, location as unknown as GQLocation)),
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
        : // eslint-disable-next-line @typescript-eslint/no-deprecated
          workout.location
          ? // eslint-disable-next-line @typescript-eslint/no-deprecated
            locations?.find((l) => l.name === workout.location)
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
                      getSetGrade(set, location as unknown as GQLocation),
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
