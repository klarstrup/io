/* eslint-disable no-unexpected-multiline */
import { addMilliseconds, subDays, subMonths, subYears } from "date-fns";
import { ObjectId, type WithId } from "mongodb";
import type { Session } from "next-auth";
import Grade from "../grades";
import { Location, Workout, WorkoutSet } from "../graphql.generated";
import type { PRType } from "../lib";
import { ExerciseSchedule } from "../sources/fitocracy";
import { epoch } from "../utils";
import { proxyCollection } from "../utils.server";
import {
  AssistType,
  exercisesById,
  InputType,
  SendType,
  TagType,
  Unit,
} from "./exercises";
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
  to,
  userId,
  scheduleEntry,
}: {
  userId: Session["user"]["id"];
  to: Date;
  scheduleEntry: ExerciseSchedule;
}) => {
  const [workout] = await MaterializedWorkoutsView.aggregate<{
    workedOutAt: Date;
    exercise: WorkoutExercise;
  }>([
    {
      $match: {
        userId,
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
                $eq: ["$$exercise.exerciseId", scheduleEntry.exerciseId],
              },
            },
          },
        },
      },
    },
  ]).toArray();

  const dueOn = addMilliseconds(
    workout?.workedOutAt || epoch,
    durationToMs(scheduleEntry.frequency),
  );

  if (isClimbingExercise(scheduleEntry.exerciseId)) {
    if (scheduleEntry.workingSets && scheduleEntry.workingSets > 0) {
      const workouts = MaterializedWorkoutsView.aggregate<{
        workedOutAt: Date;
        exercise: WorkoutExercise;
      }>([
        {
          $match: {
            userId,
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
                    $eq: ["$$exercise.exerciseId", scheduleEntry.exerciseId],
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
        const successful = successfulSets.length >= scheduleEntry.workingSets;

        if (successful) {
          return {
            workedOutAt,
            dueOn,
            exerciseId: scheduleEntry.exerciseId,
            successful: true,
            nextWorkingSets: scheduleEntry.workingSets ?? null,
            nextWorkingSetInputs: [],
            scheduleEntry,
          };
        }
      }
    }

    return {
      workedOutAt: workout?.workedOutAt || null,
      dueOn,
      exerciseId: scheduleEntry.exerciseId,
      successful: true,
      nextWorkingSets: scheduleEntry.workingSets ?? null,
      nextWorkingSetInputs: [],
      scheduleEntry,
    };
  }

  const exercise = workout?.exercise;
  const exerciseDefinition = exercisesById[scheduleEntry.exerciseId]!;
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
      (scheduleEntry.workingReps ? setReps >= scheduleEntry.workingReps : true)
      ? set
      : acc;
  }, exercise.sets[0]);

  let heaviestSetEffort =
    heaviestSet?.inputs[effortInputIndex]?.value || scheduleEntry.baseWeight;

  const workingSets =
    (heaviestSetEffort !== undefined &&
      exercise?.sets.filter(
        ({ inputs }) => inputs[effortInputIndex]?.value === heaviestSetEffort,
      )) ||
    null;
  const successful =
    workingSets &&
    (scheduleEntry.workingSets
      ? workingSets.length >= scheduleEntry.workingSets
      : true) &&
    (scheduleEntry.workingReps
      ? !scheduleEntry.workingSets &&
        workingSets.every(
          ({ inputs }) =>
            inputs.length === 1 &&
            inputs.every(({ unit }) => unit === Unit.Reps),
        )
        ? workingSets.reduce((m, s) => m + s.inputs[0]!.value, 0) >=
          scheduleEntry.workingReps
        : workingSets.every(
            ({ inputs }) =>
              inputs[repsInputIndex] &&
              inputs[repsInputIndex].value >= scheduleEntry.workingReps!,
          )
      : true);

  if (
    !scheduleEntry.workingSets &&
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

  const goalEffort = scheduleEntry.increment
    ? heaviestSetEffort !== undefined && heaviestSetEffort !== null
      ? successful
        ? finalWorkingSetReps &&
          scheduleEntry.workingReps &&
          finalWorkingSetReps >= scheduleEntry.workingReps * 2
          ? scheduleEntry.increment * 2 + heaviestSetEffort
          : scheduleEntry.increment + heaviestSetEffort
        : scheduleEntry.deloadFactor
          ? scheduleEntry.deloadFactor * heaviestSetEffort
          : scheduleEntry.baseWeight
      : scheduleEntry.baseWeight
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
          : scheduleEntry.workingReps && type === InputType.Reps
            ? {
                value: scheduleEntry.workingReps ?? scheduleEntry.baseWeight,
                unit: Unit.Reps,
              }
            : { value: NaN },
    );

  const nextWorkingSets = scheduleEntry.workingSets ?? null;

  if (
    nextWorkingSetInputs.every(({ value }) => Number.isNaN(value)) &&
    !nextWorkingSets
  ) {
    nextWorkingSetInputs = null;
  }

  return {
    workedOutAt: workout?.workedOutAt || null,
    dueOn,
    exerciseId: scheduleEntry.exerciseId,
    successful,
    nextWorkingSetInputs,
    nextWorkingSets,
    scheduleEntry,
  };
};

export const getNextSets = async ({
  user,
  to,
}: {
  user: Session["user"];
  to: Date;
}) => {
  // console.time(`getNextSets for user ${user.id} to ${to.toISOString()}`);
  try {
    return (
      await Promise.all(
        (user.exerciseSchedules || [])
          .filter(({ enabled }) => enabled)
          .map((scheduleEntry) =>
            getNextSet({ userId: user.id, to, scheduleEntry }),
          ),
      )
    ).sort(
      (a, b) =>
        (a.workedOutAt?.getTime() || 0) - (b.workedOutAt?.getTime() || 0),
    );
  } finally {
    // console.timeEnd(`getNextSets for user ${user.id} to ${to.toISOString()}`);
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

const flashGradeRateThreshold = 0.8;
export const calculateFlashGradeOn = async (
  locations: WithId<LocationData>[],
  userId: string,
  date: Date,
) => {
  const workouts = await MaterializedWorkoutsView.find({
    userId,
    "exercises.exerciseId": 2001,
    workedOutAt: { $lte: date, $gt: subDays(date, 60) },
    deletedAt: { $exists: false },
  }).toArray();

  const climbingSets = workouts.flatMap((w) =>
    w.exercises
      .filter((e) => isClimbingExercise(e.exerciseId))
      .flatMap((e) =>
        e.sets
          .filter((s) => (s.inputs[2]?.value as SendType) !== SendType.Repeat)
          .map(
            (set) =>
              [
                set,
                locations.find((l) => l._id.toString() === w.locationId),
              ] as const,
          ),
      ),
  );

  if (!climbingSets.length) return null;

  const grades = climbingSets
    .map(([set, location]) => [set, getSetGrade(set, location)!] as const)
    .filter(([, grade]) => typeof grade === "number" && grade > 0);

  if (!grades.length) return null;

  const distinctGrades = Array.from(
    new Set(grades.map(([, grade]) => grade)),
  ).sort((a, b) => a - b);

  let flashGrade: number | null = null;
  for (const distinctGrade of distinctGrades) {
    const lowerGrade =
      distinctGrades[distinctGrades.indexOf(distinctGrade) - 1] || 0;
    const upperGrade =
      distinctGrades[distinctGrades.indexOf(distinctGrade) + 1] || Infinity;
    const sentSetsInGrade = grades
      .filter(([, grade]) => grade > lowerGrade && grade < upperGrade)
      .filter(
        ([s]) =>
          (s.inputs[2]?.value as SendType) === SendType.Top ||
          (s.inputs[2]?.value as SendType) === SendType.Flash,
      );

    if (!sentSetsInGrade.length) continue;
    if (sentSetsInGrade.length < 3) continue;

    const flashRate =
      sentSetsInGrade.filter(
        ([set]) => (set.inputs[2]?.value as SendType) === SendType.Flash,
      ).length / sentSetsInGrade.length;

    if (
      flashRate >= flashGradeRateThreshold &&
      (!flashGrade || distinctGrade > flashGrade)
    ) {
      flashGrade = distinctGrade;
    }
  }

  return flashGrade;
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
            .map((set) => getSetGrade(set, location)),
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
            .map((set) => getSetGrade(set, location)),
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
            .map((set) => getSetGrade(set, location)),
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
                    value: input.value ?? getSetGrade(set, location),
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
