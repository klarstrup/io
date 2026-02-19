import { tz } from "@date-fns/tz";
import { makeExecutableSchema } from "@graphql-tools/schema";
import * as Ably from "ably";
import { addSeconds, addWeeks, isValid, startOfDay } from "date-fns";
import {
  type DocumentNode,
  GraphQLScalarType,
  Kind,
  type OperationDefinitionNode,
  print,
} from "graphql";
import gql from "graphql-tag";
import { ObjectId } from "mongodb";
import { materializeIoWorkouts } from "./app/api/materialize_workouts/materializers";
import { auth } from "./auth";
import type {
  ExerciseInfo,
  ExerciseSchedule,
  FloatTimeSeriesEntry,
  FoodEntry,
  NextSet,
  Resolvers,
  SnoozeExerciseSchedulePayload,
  UnsnoozeExerciseSchedulePayload,
} from "./graphql.generated";
import type { MongoVTodo } from "./lib";
import { exercisesById } from "./models/exercises";
import { Locations } from "./models/location.server";
import { Users } from "./models/user.server";
import { type WorkoutExercise, WorkoutSource } from "./models/workout";
import {
  getNextSet,
  MaterializedWorkoutsView,
  Workouts,
} from "./models/workout.server";
import {
  getUserIcalEventsBetween,
  getUserIcalTodosBetween,
} from "./sources/ical";
import { IcalEvents } from "./sources/ical.server";
import { MyFitnessPalFoodEntries } from "./sources/myfitnesspal.server";
import { DataSource } from "./sources/utils";
import {
  WithingsMeasureGroup,
  WithingsSleepSummarySeries,
} from "./sources/withings.server";
import { pick, rangeToQuery } from "./utils";
import { SpiirAccountGroups } from "./sources/spiir.server";

const emitGraphQLUpdate = async (
  userId: string,
  graphQlResponse: {
    query: OperationDefinitionNode;
    fragment: DocumentNode;
    data: unknown;
  },
) => {
  const message = JSON.stringify({
    query: print({ kind: Kind.DOCUMENT, definitions: [graphQlResponse.query] }),
    fragment: print(graphQlResponse.fragment),
    data: graphQlResponse.data,
  });

  const realtimeClient = new Ably.Realtime({ key: process.env.ABLY_API_KEY });

  await realtimeClient.connection.once("connected");
  const channel = realtimeClient.channels.get("GraphQL:" + userId);
  await channel.publish({ data: message });
  realtimeClient.close();
};

const dateScalar = new GraphQLScalarType({
  name: "Date",
  description: "Date custom scalar type",
  serialize(value) {
    // Convert outgoing Date to integer for JSON
    if (value instanceof Date) return value.toISOString();

    throw Error("GraphQL Date Scalar serializer expected a `Date` object");
  },
  parseValue(value) {
    // Convert incoming integer to Date
    let date: Date | null = null;
    if (typeof value === "number") date = new Date(value);
    if (typeof value === "string") date = new Date(value);
    // SchemaLink can pass in a Date object directly
    if (value instanceof Date) date = value;

    if (date && isValid(date)) return date;

    throw new Error(
      "GraphQL Date Scalar parser expected a `number` or `string` representing a valid date",
    );
  },
  parseLiteral(ast) {
    // Convert hard-coded AST string to integer and then to Date
    let date: Date | null = null;
    if (ast.kind === Kind.INT) date = new Date(parseInt(ast.value, 10));
    if (ast.kind === Kind.STRING) date = new Date(ast.value);

    if (date && isValid(date)) return date;

    // Invalid hard-coded value (not an integer)
    return null;
  },
});

const editableTodoFields = ["summary", "start", "due", "completed"] as const;

export const resolvers: Resolvers<
  | { user: NonNullable<Awaited<ReturnType<typeof auth>>>["user"] | null }
  | undefined
> = {
  Date: dateScalar,
  Query: {
    hello: () => "worlasdd",
    user: async (_parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) return null;

      return {
        ...user,
        __typename: "User",
        exerciseSchedules:
          user.exerciseSchedules?.map(
            (schedule) =>
              ({
                ...schedule,
                __typename: "ExerciseSchedule",
                frequency: { ...schedule.frequency, __typename: "Duration" },
              }) as ExerciseSchedule,
          ) || null,
      };
    },
  },
  User: {
    availableBalance: async (_parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) return null;

      const spiirDataSource = user.dataSources?.find(
        (dataSource) => dataSource.source === DataSource.Spiir,
      );
      if (!spiirDataSource) return null;

      const spiirAccountGroups = await SpiirAccountGroups.find({
        _io_userId: user.id,
      }).toArray();

      return spiirAccountGroups.reduce(
        (totalBalance, accountGroup) =>
          (totalBalance += accountGroup.availableBalance),
        0,
      );
    },
    weight: async (_parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) return null;

      // For now, we only support Withings weight data, so we look for a Withings data source and query the weight entries from there
      const withingsDataSource = user.dataSources?.find(
        (dataSource) => dataSource.source === DataSource.Withings,
      );

      const withingsUserId =
        withingsDataSource?.config?.accessTokenResponse?.userid;
      if (!withingsUserId) return null;

      const latestWeightMeasure = (
        await WithingsMeasureGroup.findOne(
          {
            // Sometimes the token response has this as a string, sometimes as a number, so we convert it to a number here to be safe
            _withings_userId: Number(withingsUserId),
            measures: { $elemMatch: { type: 1 } },
          },
          { sort: { createdAt: -1 } },
        )
      )?.measures.find((measure) => measure.type === 1);

      return latestWeightMeasure
        ? latestWeightMeasure.value * 10 ** latestWeightMeasure.unit
        : null;
    },
    weightTimeSeries: async (_parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) return null;

      const withingsDataSource = user.dataSources?.find(
        (dataSource) => dataSource.source === DataSource.Withings,
      );
      const withingsUserId =
        withingsDataSource?.config?.accessTokenResponse?.userid;
      if (!withingsUserId) return null;

      const weightMeasureGroups = await WithingsMeasureGroup.find(
        {
          _withings_userId: Number(withingsUserId),
          measures: { $elemMatch: { type: 1 } },
        },
        { sort: { measuredAt: -1 }, limit: 14 },
      ).toArray();

      return weightMeasureGroups
        .map((group) => {
          const weightMeasure = group.measures.find((m) => m.type === 1);
          if (!weightMeasure) return null;
          return {
            timestamp: group.measuredAt,
            value: weightMeasure.value * 10 ** weightMeasure.unit,
            __typename: "FloatTimeSeriesEntry",
          } as FloatTimeSeriesEntry;
        })
        .filter(Boolean)
        .slice(0, 4)
        .reverse();
    },
    sleepDebt: async (_parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;

      if (!user) return null;

      const withingsUserId = user.dataSources?.find(
        (dataSource) => dataSource.source === DataSource.Withings,
      )?.config?.accessTokenResponse?.userid;
      if (!withingsUserId) return null;

      const sleepEntries = await WithingsSleepSummarySeries.find({
        _withings_userId: Number(withingsUserId),
        endedAt: { $gte: addWeeks(new Date(), -1) }, // Past week
      }).toArray();

      const totalSleepTime = sleepEntries.reduce(
        (total, entry) => total + entry.data.total_sleep_time,
        0,
      );

      const idealSleepTime = 8 * 60 * 60 * sleepEntries.length;

      return totalSleepTime - idealSleepTime;
    },
    sleepDebtFraction: async (_parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;

      if (!user) return null;

      const withingsUserId = user.dataSources?.find(
        (dataSource) => dataSource.source === DataSource.Withings,
      )?.config?.accessTokenResponse?.userid;
      if (!withingsUserId) return null;

      const sleepEntries = await WithingsSleepSummarySeries.find(
        {
          _withings_userId: Number(withingsUserId),
          endedAt: { $gte: addWeeks(new Date(), -2) }, // Past week
        },
        { sort: { endedAt: -1 }, limit: 7 },
      ).toArray();

      const totalSleepTime = sleepEntries.reduce(
        (total, entry) => total + entry.data.total_sleep_time,
        0,
      );

      const idealSleepTime = 8 * 60 * 60 * sleepEntries.length;

      return totalSleepTime / idealSleepTime;
    },
    sleepDebtFractionTimeSeries: async (_parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;

      if (!user) return null;

      const withingsUserId = user.dataSources?.find(
        (dataSource) => dataSource.source === DataSource.Withings,
      )?.config?.accessTokenResponse?.userid;
      if (!withingsUserId) return null;

      const sleepEntries = (
        await WithingsSleepSummarySeries.find(
          {
            _withings_userId: Number(withingsUserId),
            endedAt: { $gte: addWeeks(new Date(), -4) },
          },
          { sort: { startedAt: -1 }, limit: 14 },
        ).toArray()
      ).reverse();

      let sleepDebtFractionTimeSeries: FloatTimeSeriesEntry[] = [];
      for (let i = 6; i < sleepEntries.length; i++) {
        const windowEntries = sleepEntries.slice(i - 6, i + 1); // 7-day window

        const totalSleepTime = windowEntries.reduce(
          (total, entry) => total + entry.data.total_sleep_time,
          0,
        );

        const idealSleepTime = 8 * 60 * 60 * windowEntries.length;

        sleepDebtFractionTimeSeries.push({
          timestamp: windowEntries[windowEntries.length - 1]!.endedAt,
          value: totalSleepTime / idealSleepTime,
          __typename: "FloatTimeSeriesEntry",
        });
      }
      return sleepDebtFractionTimeSeries
        .slice()
        .reverse()
        .slice(0, 4)
        .reverse();
    },
    locations: async (parent) => {
      if (!parent.id) return [];

      return (await Locations.find({ userId: parent.id }).toArray()).map(
        (location) => ({
          ...location,
          boulderCircuits: location.boulderCircuits?.map((circuit) => ({
            ...circuit,
            __typename: "BoulderCircuit",
          })),
          __typename: "Location",
          id: String(location._id),
        }),
      );
    },
    todos: async (parent, args) =>
      (await getUserIcalTodosBetween(parent.id, args.interval)).map((todo) => ({
        ...todo,
        id: todo.uid,
        __typename: "Todo",
      })),
    events: async (parent, args) =>
      (await getUserIcalEventsBetween(parent.id, args.interval)).map(
        (event) => ({ ...event, id: event.uid, __typename: "Event" }),
      ),
    sleeps: async (_parent, args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) return [];

      // For now, we only support Withings sleep data, so we look for a Withings data source and query the sleeps from there
      const withingsDataSource = user.dataSources?.find(
        (dataSource) => dataSource.source === DataSource.Withings,
      );

      const withingsUserId =
        withingsDataSource?.config?.accessTokenResponse?.userid;
      if (!withingsUserId) return null;

      return (
        await WithingsSleepSummarySeries.find({
          // Sometimes the token response has this as a string, sometimes as a number, so we convert it to a number here to be safe
          _withings_userId: Number(withingsUserId),
          startedAt: { $gte: new Date(args.interval.start) },
          endedAt: { $lte: new Date(args.interval.end) },
        }).toArray()
      ).map(
        (sleep) =>
          ({
            ...sleep,
            deviceId: sleep.hash_deviceid,
            id: String(sleep.id),
            totalSleepTime: sleep.data.total_sleep_time,
            endedAt: addSeconds(sleep.startedAt, sleep.data.total_timeinbed),
            __typename: "Sleep",
          }) as const,
      );
    },
    foodEntries: async (_parent, args, context) => {
      const user = context?.user ?? (await auth())?.user;
      let foodEntries: FoodEntry[] = [];

      if (!user) return foodEntries;

      for (const dataSource of user.dataSources || []) {
        if (dataSource.source !== DataSource.MyFitnessPal) continue;
        for await (const document of MyFitnessPalFoodEntries.find({
          user_id: dataSource.config.userId,
          datetime: rangeToQuery(args.interval.start, args.interval.end),
        })) {
          foodEntries.push({
            ...document,
            mealName: document.meal_name,
            food: {
              ...document.food,
              __typename: "Food",
              servingSizes: document.food.serving_sizes.map((servingSize) => ({
                ...servingSize,
                __typename: "ServingSize",
                nutritionMultiplier: servingSize.nutrition_multiplier,
              })),
            },
            servingSize: {
              ...document.serving_size,
              __typename: "ServingSize",
              nutritionMultiplier: document.serving_size.nutrition_multiplier,
            },
            nutritionalContents: {
              __typename: "NutritionalContents",
              ...document.nutritional_contents,
              energy: {
                __typename: "CaloriesUnit",
                ...document.nutritional_contents.energy,
              },
            },
            __typename: "FoodEntry",
          });
        }
      }

      return foodEntries;
    },
    workouts: async (parent, args) =>
      (
        await MaterializedWorkoutsView.find({
          userId: parent.id,
          $or: [
            {
              workedOutAt: rangeToQuery(args.interval.start, args.interval.end),
            },
            // All-Day workouts are stored with workedOutAt at UTC 00:00 of the day
            { workedOutAt: startOfDay(args.interval.start, { in: tz("UTC") }) },
          ],
          deletedAt: { $exists: false },
        }).toArray()
      ).map(
        (workout) =>
          ({
            ...workout,
            location: undefined,
            exercises: workout.exercises.map(
              (exercise) =>
                ({
                  ...exercise,
                  __typename: "WorkoutExercise",
                  // This will be resolved in the WorkoutExercise.exerciseInfo resolver, I don't know how to make the type system understand that
                  exerciseInfo: undefined as unknown as ExerciseInfo,
                  sets: exercise.sets.map(
                    (set) =>
                      ({
                        ...set,
                        __typename: "WorkoutSet",
                        inputs: set.inputs.map(
                          (input) =>
                            ({
                              ...input,
                              __typename: "WorkoutSetInput",
                            }) as const,
                        ),
                        meta:
                          set.meta &&
                          Object.entries(set.meta || {}).map(
                            ([key, value]) =>
                              ({
                                key,
                                value: String(value),
                                __typename: "WorkoutSetMeta",
                              }) as const,
                          ),
                      }) as const,
                  ),
                }) as const,
            ),
            // The _id field of the MaterializedWorkoutsView is different from the Workouts document _ID
            id: workout.id || workout._id.toString(),
            __typename: "Workout",
          }) as const,
      ),
    nextSets: async (parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) return [];

      const enabledExerciseScheduleExerciseIdsToLookUpWorkoutFor = new Set(
        user.exerciseSchedules
          ?.filter((schedule) => schedule.enabled)
          .map((schedule) => schedule.exerciseId) || [],
      );
      const promises: Promise<NextSet>[] = [];
      for await (const mostRecentWorkoutOfEachEnabledExerciseSchedule of MaterializedWorkoutsView.aggregate<{
        workedOutAt: Date;
        exercise: WorkoutExercise;
      }>([
        {
          $match: {
            userId: user.id,
            "exercises.exerciseId": {
              $in: Array.from(
                enabledExerciseScheduleExerciseIdsToLookUpWorkoutFor,
              ),
            },
          },
        },
        { $sort: { workedOutAt: -1 } },
        { $unwind: "$exercises" },
        {
          $match: {
            "exercises.exerciseId": {
              $in: Array.from(
                enabledExerciseScheduleExerciseIdsToLookUpWorkoutFor,
              ),
            },
          },
        },
        // Group by exercise ID to get the most recent workout for each exercise
        {
          $group: {
            _id: "$exercises.exerciseId",
            workedOutAt: { $first: "$workedOutAt" },
            exercise: { $first: "$exercises" },
          },
        },
        // Project to match the expected output format
        { $project: { _id: 0, workedOutAt: 1, exercise: 1 } },
      ])) {
        for (const exerciseSchedule of (user.exerciseSchedules || []).filter(
          (schedule) =>
            schedule.enabled &&
            schedule.exerciseId ===
              mostRecentWorkoutOfEachEnabledExerciseSchedule.exercise
                .exerciseId,
        )) {
          promises.push(
            getNextSet({
              userId: user.id,
              exerciseSchedule,
              prefetchedWorkout: mostRecentWorkoutOfEachEnabledExerciseSchedule,
            }).then((nextSet) => ({
              ...nextSet,
              __typename: "NextSet",
              nextWorkingSetInputs: nextSet.nextWorkingSetInputs?.map(
                (input) => ({
                  ...input,
                  __typename: "WorkoutSetInput",
                }),
              ),
              exerciseSchedule: {
                ...exerciseSchedule,
                __typename: "ExerciseSchedule",
                frequency: {
                  ...exerciseSchedule.frequency,
                  __typename: "Duration",
                },
                // This will be resolved in the WorkoutExercise.exerciseInfo resolver, I don't know how to make the type system understand that
                exerciseInfo: undefined as unknown as ExerciseInfo,
              },
            })),
          );
        }
      }

      return Promise.all(promises);
    },
  },
  Mutation: {
    createTodo: async (_parent, args, context, info) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      const insertResult = await IcalEvents.insertOne({
        uid: new ObjectId().toString(),
        type: "VTODO",
        created: new Date(),
        dtstamp: new Date(),
        lastmodified: new Date(),
        params: [],
        _io_source: WorkoutSource.Self,
        _io_userId: user.id,
        ...pick(args.input.data, ...editableTodoFields),
      });

      const newTodo = await IcalEvents.findOne<MongoVTodo>({
        _id: insertResult.insertedId,
      });

      if (!newTodo) throw new Error("Failed to create todo");

      const result = {
        __typename: "CreateTodoPayload",
        todo: {
          __typename: "Todo",
          id: newTodo.uid,
          ...newTodo,
        },
      } as const;

      try {
        return result;
      } finally {
        await emitGraphQLUpdate(user.id, {
          query: info.operation,
          fragment: gql`
            fragment NewTodo on Todo {
              id
              created
              summary
              start
              due
              completed
            }
          `,
          data: result.todo,
        });
      }
    },
    updateTodo: async (_parent, args, context, info) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      const todo = await IcalEvents.findOne<MongoVTodo>({
        uid: args.input.id,
        _io_userId: user.id,
      });

      if (!todo) throw new Error("Todo not found");

      const updateResult = await IcalEvents.updateOne(
        { uid: args.input.id, _io_userId: user.id },
        { $set: pick(args.input.data, ...editableTodoFields) },
      );

      if (updateResult.matchedCount === 0) {
        throw new Error("Failed to update todo");
      }

      const updatedTodo = await IcalEvents.findOne<MongoVTodo>({
        uid: args.input.id,
        _io_userId: user.id,
      });

      if (!updatedTodo) {
        throw new Error("Todo not found after update");
      }

      const result = {
        __typename: "UpdateTodoPayload",
        todo: {
          __typename: "Todo",
          id: updatedTodo.uid,
          ...updatedTodo,
        },
      } as const;

      try {
        return result;
      } finally {
        await emitGraphQLUpdate(user.id, {
          query: info.operation,
          fragment: gql`
            fragment UpdatedTodo on Todo {
              id
              created
              summary
              start
              due
              completed
            }
          `,
          data: result.todo,
        });
      }
    },
    deleteTodo: async (_parent, args, context, info) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      const result = await IcalEvents.deleteMany({
        uid: args.id,
        _io_userId: user.id,
      });

      if (result.deletedCount === 0) throw new Error("Failed to delete todo");

      try {
        return args.id;
      } finally {
        await emitGraphQLUpdate(user.id, {
          query: info.operation,
          fragment: gql`
            fragment DeletedTodo on Todo {
              id
            }
          `,
          data: { deleteTodo: args.id },
        });
      }
    },
    snoozeExerciseSchedule: async (_parent, args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      const exerciseScheduleId = args.input.exerciseScheduleId;
      const snoozedUntil = args.input.snoozedUntil;

      const updateResult = await Users.updateOne(
        { _id: new ObjectId(user.id) },
        {
          $set: {
            exerciseSchedules: (user.exerciseSchedules ?? []).map((s) =>
              s.id === exerciseScheduleId ? { ...s, snoozedUntil } : s,
            ),
          },
        },
      );

      if (updateResult.matchedCount === 0) {
        throw new Error("Failed to snooze exercise schedule");
      }

      const updatedExerciseSchedule = (await Users.findOne({
        _id: new ObjectId(user.id),
      }))!.exerciseSchedules!.find((s) => s.id === exerciseScheduleId);

      return {
        __typename: "SnoozeExerciseSchedulePayload",
        exerciseSchedule: {
          ...updatedExerciseSchedule!,
          __typename: "ExerciseSchedule",
          frequency: {
            ...updatedExerciseSchedule!.frequency,
            __typename: "Duration",
          },
        },
      } as SnoozeExerciseSchedulePayload;
    },
    unsnoozeExerciseSchedule: async (_parent, args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      const exerciseScheduleId = args.input.exerciseScheduleId;

      const updateResult = await Users.updateOne(
        { _id: new ObjectId(user.id) },
        {
          $set: {
            exerciseSchedules: (user.exerciseSchedules ?? []).map((s) =>
              s.id === exerciseScheduleId ? { ...s, snoozedUntil: null } : s,
            ),
          },
        },
      );

      if (updateResult.matchedCount === 0) {
        throw new Error("Failed to unsnooze exercise schedule");
      }

      const updatedExerciseSchedule = (await Users.findOne({
        _id: new ObjectId(user.id),
      }))!.exerciseSchedules!.find((s) => s.id === exerciseScheduleId);

      return {
        __typename: "UnsnoozeExerciseSchedulePayload",
        exerciseSchedule: {
          ...updatedExerciseSchedule!,
          __typename: "ExerciseSchedule",
          frequency: {
            ...updatedExerciseSchedule!.frequency,
            __typename: "Duration",
          },
        },
      } as UnsnoozeExerciseSchedulePayload;
    },
    updateWorkout: async (_parent, args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      const workoutId = args.input.id;
      const workedOutAt = args.input.data.workedOutAt;

      if (!workoutId || !workedOutAt) {
        throw new Error("workoutId and workedOutAt are required");
      }

      const updateResult = await Workouts.updateOne(
        { _id: new ObjectId(workoutId), userId: user.id },
        { $set: { workedOutAt } },
      );

      if (updateResult.matchedCount === 0) {
        throw new Error("Failed to update workout");
      }

      for await (const _ of materializeIoWorkouts(user)) {
      }

      const updatedWorkout = await MaterializedWorkoutsView.findOne({
        id: workoutId,
        userId: user.id,
      });

      if (!updatedWorkout) {
        throw new Error("Workout not found after update");
      }

      return {
        __typename: "UpdateWorkoutPayload",
        workout: {
          __typename: "Workout",
          ...updatedWorkout,
          location: undefined,
          exercises: updatedWorkout.exercises.map(
            (exercise) =>
              ({
                ...exercise,
                __typename: "WorkoutExercise",
                exerciseInfo: undefined as unknown as ExerciseInfo,
                sets: exercise.sets.map(
                  (set) =>
                    ({
                      ...set,
                      __typename: "WorkoutSet",
                      inputs: set.inputs.map(
                        (input) =>
                          ({
                            ...input,
                            __typename: "WorkoutSetInput",
                          }) as const,
                      ),
                      meta:
                        set.meta &&
                        Object.entries(set.meta || {}).map(
                          ([key, value]) =>
                            ({
                              key,
                              value: String(value),
                              __typename: "WorkoutSetMeta",
                            }) as const,
                        ),
                    }) as const,
                ),
              }) as const,
          ),
          id: updatedWorkout.id || updatedWorkout._id.toString(),
        },
      };
    },
  },
  BoulderCircuit: {
    gradeEstimate: (parent) =>
      typeof parent.gradeEstimate === "number" &&
      !Number.isNaN(parent.gradeEstimate)
        ? parent.gradeEstimate
        : null,
    gradeRange: (parent) =>
      parent.gradeRange?.map((v) =>
        typeof v === "number" && !Number.isNaN(v) ? v : null,
      ) || null,
  },
  Workout: {
    location: async (parent) => {
      if (!parent.locationId) return null;

      const location = await Locations.findOne({
        _id: new ObjectId(parent.locationId),
      });

      if (!location) return null;

      return {
        ...location,
        boulderCircuits: location.boulderCircuits?.map((circuit) => ({
          ...circuit,
          __typename: "BoulderCircuit",
        })),
        __typename: "Location",
        id: String(location._id),
      };
    },
  },
  WorkoutExercise: {
    exerciseInfo: async (parent) => {
      const exerciseInfo = exercisesById.get(parent.exerciseId);

      if (!exerciseInfo) {
        throw new Error(
          `Exercise info not found for exercise ID ${parent.exerciseId}`,
        );
      }

      return {
        ...exerciseInfo,
        isHidden: exerciseInfo.is_hidden,
        __typename: "ExerciseInfo",
        inputs: exerciseInfo.inputs.map((input) => ({
          ...input,
          __typename: "ExerciseInfoInput",
        })),
        instructions: exerciseInfo.instructions.map((instruction) => ({
          ...instruction,
          __typename: "ExerciseInfoInstruction",
        })),
        tags: exerciseInfo.tags?.map((tag) => ({
          ...tag,
          __typename: "ExerciseInfoTag",
        })),
      } satisfies ExerciseInfo;
    },
  },
  WorkoutSetInput: {
    value: (parent) =>
      typeof parent.value === "number" && !Number.isNaN(parent.value)
        ? parent.value
        : null,
  },
  ExerciseSchedule: {
    exerciseInfo: async (parent) => {
      const exerciseInfo = exercisesById.get(parent.exerciseId);

      if (!exerciseInfo) {
        throw new Error(
          `Exercise info not found for exercise ID ${parent.exerciseId}`,
        );
      }

      return {
        ...exerciseInfo,
        isHidden: exerciseInfo.is_hidden,
        __typename: "ExerciseInfo",
        inputs: exerciseInfo.inputs.map((input) => ({
          ...input,
          __typename: "ExerciseInfoInput",
        })),
        instructions: exerciseInfo.instructions.map((instruction) => ({
          ...instruction,
          __typename: "ExerciseInfoInstruction",
        })),
        tags: exerciseInfo.tags?.map((tag) => ({
          ...tag,
          __typename: "ExerciseInfoTag",
        })),
      } satisfies ExerciseInfo;
    },
    nextSet: async (parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      if (!parent.enabled) return null;

      const nextSet = await getNextSet({
        userId: user.id,
        exerciseSchedule: parent,
      });

      return {
        ...nextSet,
        nextWorkingSetInputs:
          nextSet.nextWorkingSetInputs?.map((input) => ({
            ...input,
            __typename: "WorkoutSetInput",
          })) || null,
        exerciseSchedule: {
          ...nextSet.exerciseSchedule,
          __typename: "ExerciseSchedule",
          frequency: {
            ...nextSet.exerciseSchedule.frequency,
            __typename: "Duration",
          },
        },
        __typename: "NextSet",
      } as NextSet;
    },
  },
};

export const typeDefs = gql`
  scalar Date

  type Query {
    hello: String
    user: User
  }

  input TodoInput {
    summary: String
    start: Date
    due: Date
    completed: Date
  }

  input CreateTodoInput {
    data: TodoInput!
  }

  type CreateTodoPayload {
    todo: Todo
  }

  input UpdateTodoInput {
    id: ID!
    data: TodoInput!
  }

  type UpdateTodoPayload {
    todo: Todo
  }

  input SnoozeExerciseScheduleInput {
    exerciseScheduleId: ID!
    snoozedUntil: Date
  }
  input UnsnoozeExerciseScheduleInput {
    exerciseScheduleId: ID!
  }
  type SnoozeExerciseSchedulePayload {
    exerciseSchedule: ExerciseSchedule
  }
  type UnsnoozeExerciseSchedulePayload {
    exerciseSchedule: ExerciseSchedule
  }

  type UpdateWorkoutPayload {
    workout: Workout
  }

  input UpdateWorkoutInput {
    id: ID!
    data: UpdateWorkoutDataInput!
  }

  input UpdateWorkoutDataInput {
    workedOutAt: Date
    locationId: String
  }

  type Mutation {
    createTodo(input: CreateTodoInput!): CreateTodoPayload
    updateTodo(input: UpdateTodoInput!): UpdateTodoPayload
    deleteTodo(id: String!): String
    snoozeExerciseSchedule(
      input: SnoozeExerciseScheduleInput!
    ): SnoozeExerciseSchedulePayload
    unsnoozeExerciseSchedule(
      input: UnsnoozeExerciseScheduleInput!
    ): UnsnoozeExerciseSchedulePayload
    updateWorkout(input: UpdateWorkoutInput!): UpdateWorkoutPayload
  }

  input IntervalInput {
    start: Date!
    end: Date!
  }

  type FloatTimeSeriesEntry {
    timestamp: Date!
    value: Float!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    image: String!
    emailVerified: Boolean
    timeZone: String
    locations: [Location!]
    todos(interval: IntervalInput): [Todo!]
    events(interval: IntervalInput!): [Event!]
    workouts(interval: IntervalInput!): [Workout!]
    nextSets: [NextSet!]
    exerciseSchedules: [ExerciseSchedule!]
    foodEntries(interval: IntervalInput!): [FoodEntry!]
    sleeps(interval: IntervalInput!): [Sleep!]
    weight: Float
    weightTimeSeries: [FloatTimeSeriesEntry!]
    sleepDebt: Float
    sleepDebtFraction: Float
    sleepDebtFractionTimeSeries: [FloatTimeSeriesEntry!]
    availableBalance: Float
    # dataSources: [UserDataSource!]
  }

  type Sleep {
    id: ID!
    deviceId: String!
    startedAt: Date!
    endedAt: Date!
    totalSleepTime: Float!
  }

  type FoodEntry {
    id: ID!
    type: String!
    datetime: Date!
    nutritionalContents: NutritionalContents!
    mealName: String!
    food: Food!
    servings: Float!
    servingSize: ServingSize!
  }

  type Food {
    id: ID!
    description: String!
    servingSizes: [ServingSize!]!
  }

  type ServingSize {
    unit: String!
    value: Float!
    nutritionMultiplier: Float!
  }

  type NutritionalContents {
    energy: CaloriesUnit!
    protein: Float
  }

  type CaloriesUnit {
    unit: String!
    value: Float!
  }

  type Duration {
    years: Float
    months: Float
    weeks: Float
    days: Float
    hours: Float
    minutes: Float
    seconds: Float
  }

  type ExerciseSchedule {
    id: ID!
    exerciseId: Int!
    exerciseInfo: ExerciseInfo!
    enabled: Boolean!
    frequency: Duration!
    increment: Float
    workingSets: Int
    workingReps: Int
    deloadFactor: Float
    baseWeight: Float
    snoozedUntil: Date
    order: Int
    nextSet: NextSet
  }

  type NextSet {
    # This is just the schedule entry ID prefixed with "next-", so normalizing works
    id: ID!
    workedOutAt: Date
    dueOn: Date!
    exerciseId: Int!
    successful: Boolean
    nextWorkingSets: Int
    nextWorkingSetInputs: [WorkoutSetInput!]
    exerciseSchedule: ExerciseSchedule!
  }

  type Todo {
    id: ID!
    created: Date
    summary: String
    start: Date
    due: Date
    completed: Date
    order: Int
  }

  type Event {
    id: ID!
    created: Date
    summary: String
    start: Date!
    end: Date!
    due: Date
    datetype: String!
    location: String
    order: Int
  }

  type Location {
    id: ID!
    userId: ID!
    name: String!
    createdAt: Date!
    updatedAt: Date!
    isFavorite: Boolean
    knownAddresses: [String!]
    boulderCircuits: [BoulderCircuit!]
  }

  type BoulderCircuit {
    id: ID!
    name: String!
    createdAt: Date!
    updatedAt: Date!
    description: String
    holdColor: String
    holdColorSecondary: String
    labelColor: String
    gradeEstimate: Float
    gradeRange: [Float]
    hasZones: Boolean
  }

  type Workout {
    id: ID!
    workedOutAt: Date!
    materializedAt: Date
    createdAt: Date!
    updatedAt: Date!
    locationId: String
    source: String
    exercises: [WorkoutExercise!]!
    location: Location
  }

  type WorkoutExercise {
    exerciseId: Int!
    exerciseInfo: ExerciseInfo!
    sets: [WorkoutSet!]!
    displayName: String
    comment: String
  }

  type ExerciseInfo {
    id: Int!
    name: String!
    aliases: [String!]!
    inputs: [ExerciseInfoInput!]!
    instructions: [ExerciseInfoInstruction!]!
    isHidden: Boolean!
    tags: [ExerciseInfoTag!]
  }

  type ExerciseInfoInput {
    # populate this when migrating workoutform to use ExerciseInfo instead of ExerciseData
    type: String!
  }

  type ExerciseInfoInstruction {
    value: String!
  }

  type ExerciseInfoTag {
    name: String!
    type: String!
  }

  type WorkoutSet {
    createdAt: Date
    updatedAt: Date
    inputs: [WorkoutSetInput!]!
    meta: [WorkoutSetMeta!]
    comment: String
  }

  type WorkoutSetMeta {
    key: String!
    value: String!
  }

  type WorkoutSetInput {
    unit: String
    value: Float
    # "weighted" or "assisted"
    assistType: String
  }
`;

export const schema = makeExecutableSchema({ typeDefs, resolvers });
