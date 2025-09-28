/* eslint-disable no-unexpected-multiline */
import {
  eachMonthOfInterval,
  endOfMonth,
  startOfMonth,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import type { WithId } from "mongodb";
import type { Session } from "next-auth";
import Grade, { frenchRounded } from "../grades";
import type { PRType } from "../lib";
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
import { Locations } from "./location.server";
import {
  getSetGrade,
  isClimbingExercise,
  type WorkoutData,
  type WorkoutExercise,
  type WorkoutExerciseSet,
  type WorkoutExerciseSetInput,
  WorkoutSource,
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
                scheduleEntry.workingReps &&
                (!accWeight || setWeight > accWeight) &&
                setReps >= scheduleEntry.workingReps
                ? set
                : acc;
            }, exercise.sets[0]);

            let heaviestSetEffort =
              heaviestSet?.inputs[effortInputIndex]?.value ||
              scheduleEntry.baseWeight;

            const workingSets =
              (heaviestSetEffort !== undefined &&
                exercise?.sets.filter(
                  ({ inputs }) =>
                    inputs[effortInputIndex]?.value === heaviestSetEffort,
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
                        inputs[repsInputIndex].value >=
                          scheduleEntry.workingReps!,
                    )
                : true);

            if (
              !scheduleEntry.workingSets &&
              workingSets?.every(
                ({ inputs }) =>
                  inputs.length === 1 &&
                  inputs.every(({ unit }) => unit === Unit.Reps),
              )
            ) {
              heaviestSetEffort = workingSets.reduce(
                (m, s) => m + Number(s.inputs[0]!.value),
                0,
              );
            }

            const finalWorkingSetReps =
              workingSets?.[workingSets.length - 1]?.inputs[repsInputIndex]
                ?.value;

            const goalEffort = scheduleEntry.increment
              ? heaviestSetEffort !== undefined
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
                  ({ name, type }) =>
                    name === "Barbell" && type === TagType.Equipment,
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
                        unit:
                          exercise?.sets[0]?.inputs[inputIndex]?.unit ||
                          metric_unit,
                      }
                    : scheduleEntry.workingReps && type === InputType.Reps
                      ? {
                          value:
                            scheduleEntry.workingReps ??
                            scheduleEntry.baseWeight,
                          unit: Unit.Reps,
                        }
                      : { value: NaN },
              );

            const nextWorkingSets = scheduleEntry.workingSets ?? NaN;

            if (
              nextWorkingSetInputs.every(({ value }) => Number.isNaN(value)) &&
              !nextWorkingSets
            ) {
              nextWorkingSetInputs = null;
            }

            return {
              workedOutAt: workout?.workedOutAt || null,
              exerciseId: scheduleEntry.exerciseId,
              successful,
              nextWorkingSetInputs,
              nextWorkingSets,
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

    await MaterializedWorkoutsView.createIndexes([
      { key: { "exercises.exerciseId": 1, userId: 1, workedOutAt: -1 } },
    ]);
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
      const inputGrade = getSetGrade(set, set.location);
      if (inputGrade) return inputGrade >= 6.67;
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

//  void calculateFlashRateByMonth("65a85e2c9a437530d3de2e35", new Date());

const flashGradeRateThreshold = 0.8;
export const calculateFlashGradeOn = async (userId: string, date: Date) => {
  const workouts = await MaterializedWorkoutsView.find({
    userId,
    "exercises.exerciseId": 2001,
    workedOutAt: { $lte: date, $gt: subDays(date, 60) },
    deletedAt: { $exists: false },
  }).toArray();
  const locations = await Locations.find({ userId }).toArray();

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
    .map(
      ([set, location]) =>
        [set, location, getSetGrade(set, location)!] as const,
    )
    .filter(([, , grade]) => typeof grade === "number" && grade > 0);

  if (!grades.length) return null;

  let flashGrade: number | null = null;
  for (const systemGrade of frenchRounded.data) {
    const lowerGrade =
      frenchRounded.data[frenchRounded.data.indexOf(systemGrade) - 1]?.value ||
      0;
    const upperGrade =
      frenchRounded.data[frenchRounded.data.indexOf(systemGrade) + 1]?.value ||
      Infinity;
    const sentSetsInGrade = grades
      .filter(([, , grade]) => grade > lowerGrade && grade < upperGrade)
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
      (!flashGrade || systemGrade.value > flashGrade)
    ) {
      flashGrade = systemGrade.value;
    }
  }

  return flashGrade;
};

export const calculate60dayTop10AverageSendGrade = async (
  userId: string,
  date: Date,
) => {
  const workouts = await MaterializedWorkoutsView.find({
    userId,
    "exercises.exerciseId": 2001,
    source: WorkoutSource.TopLogger,
    workedOutAt: { $lte: date, $gt: subDays(date, 60) },
    deletedAt: { $exists: false },
  }).toArray();
  const locations = await Locations.find({ userId }).toArray();

  const climbingSets = workouts.flatMap((w) =>
    w.exercises
      .filter((e) => isClimbingExercise(e.exerciseId))
      .flatMap((e) =>
        e.sets
          .filter(
            (s) =>
              (s.inputs[2]?.value as SendType) === SendType.Top ||
              (s.inputs[2]?.value as SendType) === SendType.Flash,
          )
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
    .map(
      ([set, location]) =>
        [set, location, getSetGrade(set, location)!] as const,
    )
    .filter(([, , grade]) => typeof grade === "number" && grade > 0)
    .sort((a, b) => b[2] - a[2]);

  if (!grades.length) return null;

  return grades.slice(0, 10).reduce((sum, [, , grade]) => sum + grade, 0) / 10;
};

export const calculate60dayTop10AverageFlashGrade = async (
  userId: string,
  date: Date,
) => {
  const workouts = await MaterializedWorkoutsView.find({
    userId,
    "exercises.exerciseId": 2001,
    source: WorkoutSource.TopLogger,
    workedOutAt: { $lte: date, $gt: subDays(date, 60) },
    deletedAt: { $exists: false },
  }).toArray();
  const locations = await Locations.find({ userId }).toArray();

  const climbingSets = workouts.flatMap((w) =>
    w.exercises
      .filter((e) => isClimbingExercise(e.exerciseId))
      .flatMap((e) =>
        e.sets
          .filter((s) => (s.inputs[2]?.value as SendType) === SendType.Flash)
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
    .map(
      ([set, location]) =>
        [set, location, getSetGrade(set, location)!] as const,
    )
    .filter(([, , grade]) => typeof grade === "number" && grade > 0)
    .sort((a, b) => b[2] - a[2]);

  if (!grades.length) return null;

  return grades.slice(0, 10).reduce((sum, [, , grade]) => sum + grade, 0) / 10;
};

export const calculate60dayTop10AverageAttemptGrade = async (
  userId: string,
  date: Date,
) => {
  const workouts = await MaterializedWorkoutsView.find({
    userId,
    "exercises.exerciseId": 2001,
    source: WorkoutSource.TopLogger,
    workedOutAt: { $lte: date, $gt: subDays(date, 60) },
    deletedAt: { $exists: false },
  }).toArray();
  const locations = await Locations.find({ userId }).toArray();

  const climbingSets = workouts.flatMap((w) =>
    w.exercises
      .filter((e) => isClimbingExercise(e.exerciseId))
      .flatMap((e) =>
        e.sets
          .filter((s) => (s.inputs[2]?.value as SendType) === SendType.Attempt)
          .map(
            (set) =>
              [
                set,
                locations.find((l) => l._id.toString() === w.locationId),
              ] as const,
          ),
      ),
  );

  if (!climbingSets.length || climbingSets.length <= 10) return null;

  const grades = climbingSets
    .map(
      ([set, location]) =>
        [set, location, getSetGrade(set, location)!] as const,
    )
    .filter(([, , grade]) => typeof grade === "number" && grade > 0)
    .sort((a, b) => b[2] - a[2]);

  if (!grades.length) return null;

  return grades.slice(0, 10).reduce((sum, [, , grade]) => sum + grade, 0) / 10;
};

export async function calculateClimbingStats(
  setAndLocationPairs: (readonly [
    location: LocationData | undefined,
    set: WorkoutExerciseSet,
  ])[],
  userId?: string,
  on?: Date,
) {
  const successfulSetAndLocationPairs = setAndLocationPairs.filter(
    ([, set]) =>
      (set.inputs[2]!.value as SendType) !== SendType.Attempt &&
      (set.inputs[2]!.value as SendType) !== SendType.Zone,
  );
  const problemCount = successfulSetAndLocationPairs.length;
  const gradeSum = successfulSetAndLocationPairs.reduce(
    (sum, [location, set]) => sum + (getSetGrade(set, location) || 0),
    0,
  );
  const gradeTop5Average =
    successfulSetAndLocationPairs
      .map(([location, set]) => getSetGrade(set, location) ?? 0)
      .filter((grade) => grade > 0)
      .sort((a, b) => b - a)
      .slice(0, Math.min(5, successfulSetAndLocationPairs.length))
      .reduce((sum, grade) => sum + grade, 0) /
    Math.min(5, successfulSetAndLocationPairs.length);

  const flashGrade =
    userId && on ? await calculateFlashGradeOn(userId, on) : null;

  return (
    <small className="text-[10px]">
      {problemCount ? <span>PC: {problemCount}</span> : null}
      {gradeSum ? <span>, GS: {gradeSum.toFixed(0)}</span> : null}
      {gradeTop5Average ? (
        <span>
          , T5A: {new Grade(gradeTop5Average).nameFloor}
          {new Grade(gradeTop5Average).subGradePercent ? (
            <small>+{new Grade(gradeTop5Average).subGradePercent}%</small>
          ) : null}
        </span>
      ) : null}
      {flashGrade ? <span>, 1MFG: {new Grade(flashGrade).name}</span> : null}
    </small>
  );
}
