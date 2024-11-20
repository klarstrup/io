import { isAfter, subMonths, subYears } from "date-fns";
import type { Condition, WithId } from "mongodb";
import type { Session } from "next-auth";
import {
  TopLoggerClimbUser,
  TopLoggerClimbUserDereferenced,
} from "../app/api/toplogger_gql_scrape/route";
import type { PRType } from "../lib";
import {
  exerciseIdsThatICareAbout,
  Fitocracy,
  theDayFitocracyDied,
  workoutFromFitocracyWorkout,
} from "../sources/fitocracy";
import { FitocracyWorkouts } from "../sources/fitocracy.server";
import { type RunDouble, workoutFromRunDouble } from "../sources/rundouble";
import { RunDoubleRuns } from "../sources/rundouble.server";
import { dateToString } from "../utils";
import { proxyCollection } from "../utils.server";
import {
  dereferenceDocument,
  TopLoggerGraphQL,
  workoutFromTopLoggerClimbUsers,
  workoutWithoutSetsFromTopLoggerClimbUsers,
} from "../utils/graphql";
import { exercises, InputType } from "./exercises";
import type {
  WorkoutData,
  WorkoutDataShallow,
  WorkoutExerciseSet,
} from "./workout";

export const Workouts = proxyCollection<WorkoutData>("workouts");

export async function getAllWorkouts({
  user,
  exerciseId,
  workedOutAt,
}: {
  user: Session["user"];
  exerciseId?: number;
  workedOutAt?: Condition<Date>;
}) {
  const allWorkouts: WithId<WorkoutData>[] = [];

  const workoutsQuery: Condition<WorkoutData> = {
    userId: user.id,
    deletedAt: { $exists: false },
  };
  if (exerciseId) workoutsQuery["exercises.exerciseId"] = exerciseId;
  if (workedOutAt) workoutsQuery.workedOutAt = workedOutAt;

  for await (const workout of Workouts.find(workoutsQuery)) {
    allWorkouts.push(workout);
  }

  const skipPostFitocracyWorkouts =
    workedOutAt &&
    (("$gte" in workedOutAt &&
      workedOutAt.$gte &&
      isAfter(workedOutAt.$gte, new Date(2024, 6, 15))) ||
      ("$gt" in workedOutAt &&
        workedOutAt.$gt &&
        isAfter(workedOutAt.$gt, new Date(2024, 6, 15))));
  if (user.fitocracyUserId && !skipPostFitocracyWorkouts) {
    const fitocracyWorkoutsQuery: Condition<Fitocracy.MongoWorkout> = {
      user_id: user.fitocracyUserId,
    };
    if (exerciseId) {
      fitocracyWorkoutsQuery["root_group.children.exercise.exercise_id"] =
        exerciseId;
    }
    if (workedOutAt) {
      fitocracyWorkoutsQuery.workout_timestamp = workedOutAt;
    }

    for await (const fitocracyWorkout of FitocracyWorkouts.find(
      fitocracyWorkoutsQuery,
    )) {
      allWorkouts.push(workoutFromFitocracyWorkout(fitocracyWorkout));
    }
  }

  if (user.runDoubleId && (exerciseId === 518 || !exerciseId)) {
    const runDoubleRunsQuery: Condition<RunDouble.MongoHistoryItem> = {
      userId: user.runDoubleId,
    };
    if (workedOutAt) runDoubleRunsQuery.completedAt = workedOutAt;

    for await (const runDoubleRun of RunDoubleRuns.find(runDoubleRunsQuery)) {
      allWorkouts.push(workoutFromRunDouble(runDoubleRun));
    }
  }

  if ((exerciseId === 2001 || !exerciseId) && user.topLoggerGraphQLId) {
    const climbUsersQuery: Condition<TopLoggerClimbUser> = {
      __typename: "ClimbUser",
      userId: user.topLoggerGraphQLId,
    };

    if (workedOutAt) {
      climbUsersQuery.tickedFirstAtDate = workedOutAt;
    }

    const climbUsers = await TopLoggerGraphQL.find<WithId<TopLoggerClimbUser>>(
      climbUsersQuery,
      { sort: { tickedFirstAtDate: 1 } },
    ).toArray();

    const dereferencedClimbUsers = await Promise.all(
      climbUsers.map((climbUser) =>
        dereferenceDocument<
          WithId<TopLoggerClimbUser>,
          WithId<TopLoggerClimbUserDereferenced>
        >(climbUser),
      ),
    );

    const climbUsersByDay = Object.values(
      dereferencedClimbUsers
        .sort((a, b) =>
          a.holdColor.nameLoc
            .toLowerCase()
            .localeCompare(b.holdColor.nameLoc.toLowerCase()),
        )
        .sort((a, b) => a.climb.grade - b.climb.grade)
        .reduce(
          (acc, climbUser) => {
            if (!climbUser.tickedFirstAtDate) return acc;
            const date = dateToString(climbUser.tickedFirstAtDate);

            if (!Array.isArray(acc[date])) {
              acc[date] = [climbUser];
            } else {
              acc[date].push(climbUser);
            }

            return acc;
          },
          {} as Record<
            `${number}-${number}-${number}`,
            WithId<TopLoggerClimbUserDereferenced>[]
          >,
        ),
    );

    for (const climbUsersOfDay of climbUsersByDay) {
      allWorkouts.push(workoutFromTopLoggerClimbUsers(climbUsersOfDay));
    }
  }

  return allWorkouts;
}

export async function getAllWorkoutsWithoutSets({
  user,
  exerciseId,
  workedOutAt,
}: {
  user: Session["user"];
  exerciseId?: number;
  workedOutAt?: Condition<Date>;
}) {
  const allWorkouts: WithId<WorkoutDataShallow>[] = [];

  const workoutsQuery: Condition<WorkoutDataShallow> = {
    userId: user.id,
    deletedAt: { $exists: false },
  };
  if (exerciseId) workoutsQuery["exercises.exerciseId"] = exerciseId;
  if (workedOutAt) workoutsQuery.workedOutAt = workedOutAt;

  for await (const workout of Workouts.find(workoutsQuery)) {
    allWorkouts.push(workout);
  }

  const skipPostFitocracyWorkouts =
    workedOutAt &&
    (("$gte" in workedOutAt &&
      workedOutAt.$gte &&
      isAfter(workedOutAt.$gte, theDayFitocracyDied)) ||
      ("$gt" in workedOutAt &&
        workedOutAt.$gt &&
        isAfter(workedOutAt.$gt, theDayFitocracyDied)));
  if (user.fitocracyUserId && !skipPostFitocracyWorkouts) {
    const fitocracyWorkoutsQuery: Condition<Fitocracy.MongoWorkout> = {
      user_id: user.fitocracyUserId,
    };
    if (exerciseId) {
      fitocracyWorkoutsQuery["root_group.children.exercise.exercise_id"] =
        exerciseId;
    }
    if (workedOutAt) {
      fitocracyWorkoutsQuery.workout_timestamp = workedOutAt;
    }

    for await (const fitocracyWorkout of FitocracyWorkouts.find(
      fitocracyWorkoutsQuery,
    )) {
      allWorkouts.push(workoutFromFitocracyWorkout(fitocracyWorkout));
    }
  }

  if (user.runDoubleId && (exerciseId === 518 || !exerciseId)) {
    const runDoubleRunsQuery: Condition<RunDouble.MongoHistoryItem> = {
      userId: user.runDoubleId,
    };
    if (workedOutAt) runDoubleRunsQuery.completedAt = workedOutAt;

    for await (const runDoubleRun of RunDoubleRuns.find(runDoubleRunsQuery)) {
      allWorkouts.push(workoutFromRunDouble(runDoubleRun));
    }
  }

  if ((exerciseId === 2001 || !exerciseId) && user.topLoggerGraphQLId) {
    const climbUsersQuery: Condition<TopLoggerClimbUser> = {
      __typename: "ClimbUser",
      userId: user.topLoggerGraphQLId,
    };

    if (workedOutAt) {
      climbUsersQuery.tickedFirstAtDate = workedOutAt;
    }

    const climbUsers =
      await TopLoggerGraphQL.find<WithId<TopLoggerClimbUser>>(
        climbUsersQuery,
      ).toArray();

    const climbUsersByDay = Object.values(
      climbUsers.reduce(
        (acc, climbUser) => {
          if (!climbUser.tickedFirstAtDate) return acc;
          const date = dateToString(climbUser.tickedFirstAtDate);

          if (!Array.isArray(acc[date])) {
            acc[date] = [climbUser];
          } else {
            acc[date].push(climbUser);
          }

          return acc;
        },
        {} as Record<
          `${number}-${number}-${number}`,
          WithId<TopLoggerClimbUser>[]
        >,
      ),
    );

    for (const climbUsersOfDay of climbUsersByDay) {
      allWorkouts.push(
        workoutWithoutSetsFromTopLoggerClimbUsers(climbUsersOfDay),
      );
    }
  }

  return allWorkouts;
}

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
      exerciseIdsThatICareAbout.map(async (id) => {
        const workout = await Workouts.findOne(
          {
            userId: user.id,
            "exercises.exerciseId": id,
            deletedAt: { $exists: false },
            workedOutAt: { $lte: to },
          },
          { sort: { workedOutAt: -1 } },
        );

        const fitWorkout = user.fitocracyUserId
          ? await FitocracyWorkouts.findOne(
              {
                user_id: user.fitocracyUserId,
                "root_group.children.exercise.exercise_id": id,
                workout_timestamp: { $lte: to },
              },
              { sort: { workout_timestamp: -1 } },
            )
          : null;
        const fitocracyWorkout =
          fitWorkout && workoutFromFitocracyWorkout(fitWorkout);

        const recentmostWorkout =
          workout && fitocracyWorkout
            ? isAfter(workout.workedOutAt, fitocracyWorkout.workedOutAt)
              ? workout
              : fitocracyWorkout
            : (workout ?? fitocracyWorkout ?? null);

        return [id, recentmostWorkout] as const;
      }),
    )
  )
    .map(([id, workout]) => {
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
        const setReps = set.inputs[repsInputIndex]!.value;
        const setWeight = set.inputs[weightInputIndex]!.value;
        const accWeight = acc?.inputs[weightInputIndex]!.value;
        return setWeight &&
          accWeight &&
          setWeight > accWeight &&
          setReps >= WORKING_SET_REPS
          ? set
          : acc;
      }, exercise.sets[0]);

      const workingSets = exercise?.sets.filter(
        (set) =>
          set.inputs[weightInputIndex]!.value ===
          heaviestSet?.inputs[weightInputIndex]!.value,
      );

      const successful =
        workingSets &&
        (workingSets.length >= WORKING_SETS ||
          (id === DEADLIFT_ID &&
            workingSets.length >= WORKING_SETS_FOR_DEADLIFT)) &&
        workingSets.every(
          (sets) => sets.inputs[repsInputIndex]!.value >= WORKING_SET_REPS,
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
