import { tz } from "@date-fns/tz";
import { gmail } from "@googleapis/gmail";
import { makeExecutableSchema } from "@graphql-tools/schema";
import * as Ably from "ably";
import {
  addDays,
  addWeeks,
  differenceInHours,
  Interval,
  isValid,
  max,
  startOfDay,
  subDays,
} from "date-fns";
import { OAuth2Client } from "google-auth-library";
import {
  type DocumentNode,
  GraphQLScalarType,
  Kind,
  type OperationDefinitionNode,
  print,
} from "graphql";
import gql from "graphql-tag";
import GraphQLJSON, { GraphQLJSONObject } from "graphql-type-json";
import { ObjectId } from "mongodb";
import { materializeIoWorkouts } from "./app/api/materialize_workouts/materializers";
import { auth } from "./auth";
import type {
  GQCreateTodoPayload,
  GQExerciseInfo,
  GQExerciseSchedule,
  GQFloatTimeSeriesEntry,
  GQFoodEntry,
  GQNextSet,
  GQResolvers,
  GQSleep,
  GQSnoozeExerciseSchedulePayload,
  GQUnsnoozeExerciseSchedulePayload,
  GQUpdateTodoPayload,
  GQWorkout,
  GQWorkoutExercise,
  GQWorkoutSet,
  GQWorkoutSetInput,
  GQWorkoutSetMeta,
} from "./graphql.generated";
import type { MongoVTodo } from "./lib";
import { exercisesById } from "./models/exercises";
import { AssistType, Unit } from "./models/exercises.types";
import { Locations } from "./models/location.server";
import { Accounts, Users } from "./models/user.server";
import { type WorkoutData, WorkoutSource } from "./models/workout";
import {
  getNextSets,
  MaterializedWorkoutsView,
  WorkoutExercisesView,
  WorkoutLocationsView,
  Workouts,
} from "./models/workout.server";
import {
  getUserIcalEventsBetween,
  getUserIcalTodosBetween,
} from "./sources/ical";
import { IcalEvents } from "./sources/ical.server";
import { MyFitnessPalFoodEntries } from "./sources/myfitnesspal.server";
import { SpiirAccountGroups } from "./sources/spiir.server";
import { DataSource } from "./sources/utils";
import { Withings } from "./sources/withings";
import {
  WithingsMeasureGroup,
  WithingsSleepSummarySeries,
} from "./sources/withings.server";
import {
  dayStartHour,
  endOfDayButItRespectsDayStartHour,
  omitUndefined,
  pick,
  rangeToQuery,
} from "./utils";

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

const editableTodoFields = ["summary", "due", "completed"] as const;

const idealDailySleepInSeconds = 8 * 60 * 60;

export const resolvers: GQResolvers<
  | { user: NonNullable<Awaited<ReturnType<typeof auth>>>["user"] | null }
  | undefined
> = {
  Date: dateScalar,
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
  Query: {
    hello: () => "worlasdd",
    user: async (_parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      return {
        ...user,
        __typename: "User",
        dataSources: user.dataSources?.map((dataSource) => ({
          ...dataSource,
          config: JSON.stringify(dataSource.config),
          __typename: "UserDataSource",
        })),
        exerciseSchedules:
          user.exerciseSchedules?.map(
            (schedule) =>
              ({
                ...schedule,
                __typename: "ExerciseSchedule",
                frequency: { ...schedule.frequency, __typename: "Duration" },
                // This will be resolved in the WorkoutExercise.exerciseInfo resolver, I don't know how to make the type system understand that
                exerciseInfo: undefined as unknown as GQExerciseInfo,
              }) satisfies GQExerciseSchedule,
          ) || null,
      };
    },
  },
  User: {
    journalEntries: async (parent, args, context, info) => {
      const dayDate = new Date(args.dayDate);
      dayDate.setHours(dayStartHour);
      const interval = {
        start: startOfDay(subDays(dayDate, args.daysBefore ?? 0)),
        end: endOfDayButItRespectsDayStartHour(
          addDays(dayDate, args.daysAfter ?? 0),
        ),
      } satisfies Interval;

      return Promise.all([
        typeof resolvers.User?.todos === "function" &&
          resolvers.User.todos(parent, { interval }, context, info),
        typeof resolvers.User?.events === "function" &&
          resolvers.User.events(parent, { interval }, context, info),
        typeof resolvers.User?.sleeps === "function" &&
          resolvers.User.sleeps(parent, { interval }, context, info),
        typeof resolvers.User?.workouts === "function" &&
          resolvers.User.workouts(parent, { interval }, context, info),
        typeof resolvers.User?.nextSets === "function" &&
          resolvers.User.nextSets(parent, {}, context, info),
      ]).then((entries) => entries.flat().filter(Boolean));
    },
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

      // Could probably do this in the database with an aggregation, but since we expect there to be very few Spiir account groups per user, it's probably not worth the added complexity
      const rawBalance = spiirAccountGroups.reduce(
        (totalBalance, accountGroup) =>
          (totalBalance += accountGroup.availableBalance),
        0,
      );

      return Math.min(rawBalance - 10000, 9999);
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
            measures: { $elemMatch: { type: Withings.MeasureType.Weight } },
          },
          { sort: { createdAt: -1 } },
        )
      )?.measures.find(
        (measure) => measure.type === Withings.MeasureType.Weight,
      );

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
          measures: { $elemMatch: { type: Withings.MeasureType.Weight } },
        },
        { sort: { measuredAt: -1 }, limit: 14 },
      ).toArray();

      return weightMeasureGroups
        .map((group) => {
          const weightMeasure = group.measures.find(
            (m) => m.type === Withings.MeasureType.Weight,
          );
          if (!weightMeasure) return null;
          return {
            timestamp: group.measuredAt,
            value: weightMeasure.value * 10 ** weightMeasure.unit,
            __typename: "FloatTimeSeriesEntry",
          } satisfies GQFloatTimeSeriesEntry;
        })
        .filter(Boolean);
    },
    fatRatio: async (_parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) return null;

      const withingsDataSource = user.dataSources?.find(
        (dataSource) => dataSource.source === DataSource.Withings,
      );
      const withingsUserId =
        withingsDataSource?.config?.accessTokenResponse?.userid;

      if (!withingsUserId) return null;

      const latestBodyFatMeasure = (
        await WithingsMeasureGroup.findOne(
          {
            _withings_userId: Number(withingsUserId),
            measures: {
              $elemMatch: { type: Withings.MeasureType.FatRatio },
            },
          },
          { sort: { createdAt: -1 } },
        )
      )?.measures.find(
        (measure) => measure.type === Withings.MeasureType.FatRatio,
      );
      return latestBodyFatMeasure
        ? latestBodyFatMeasure.value * 10 ** latestBodyFatMeasure.unit
        : null;
    },
    fatRatioTimeSeries: async (_parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) return null;
      const withingsDataSource = user.dataSources?.find(
        (dataSource) => dataSource.source === DataSource.Withings,
      );
      const withingsUserId =
        withingsDataSource?.config?.accessTokenResponse?.userid;
      if (!withingsUserId) return null;
      const bodyFatMeasureGroups = await WithingsMeasureGroup.find(
        {
          _withings_userId: Number(withingsUserId),
          measures: {
            $elemMatch: { type: Withings.MeasureType.FatRatio },
          },
        },
        { sort: { measuredAt: -1 }, limit: 14 },
      ).toArray();
      return bodyFatMeasureGroups
        .map((group) => {
          const bodyFatMeasure = group.measures.find(
            (m) => m.type === Withings.MeasureType.FatRatio,
          );
          if (!bodyFatMeasure) return null;
          return {
            timestamp: group.measuredAt,
            value: bodyFatMeasure.value * 10 ** bodyFatMeasure.unit,
            __typename: "FloatTimeSeriesEntry",
          } satisfies GQFloatTimeSeriesEntry;
        })
        .filter(Boolean);
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

      const idealSleepTime = idealDailySleepInSeconds * sleepEntries.length;

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

      const idealSleepTime = idealDailySleepInSeconds * sleepEntries.length;

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
          { sort: { startedAt: -1 }, limit: 28 },
        ).toArray()
      ).reverse();

      const sleepDebtFractionTimeSeries: GQFloatTimeSeriesEntry[] = [];
      for (let i = 6; i < sleepEntries.length; i++) {
        const windowEntries = sleepEntries.slice(i - 6, i + 1); // 7-day window

        const totalSleepTime = windowEntries.reduce(
          (total, entry) => total + entry.data.total_sleep_time,
          0,
        );

        const idealSleepTime = idealDailySleepInSeconds * windowEntries.length;

        sleepDebtFractionTimeSeries.push({
          timestamp: windowEntries[windowEntries.length - 1]!.endedAt,
          value: totalSleepTime / idealSleepTime,
          __typename: "FloatTimeSeriesEntry",
        });
      }
      return sleepDebtFractionTimeSeries.slice(-11);
    },
    pastBusynessFraction: async (_parent, _args, context) => {
      // Get events for the past week and calculate busyness fraction based on number of hours that have events scheduled vs total hours
      const user = context?.user ?? (await auth())?.user;
      if (!user) return null;
      const userId = user.id;
      const now = new Date();
      const oneWeekAgo = addWeeks(now, -2);
      const events = await getUserIcalEventsBetween(userId, {
        start: oneWeekAgo,
        end: now,
      });
      if (!events.length) return null;
      const hoursWithEvents = new Set(
        events
          // Usually all-day events are more abstract, i.e. a holiday, a birthday, etc... so we exclude them from the busyness calculation since they don't necessarily reflect actual busy time slots in the calendar
          .filter((event) => event.datetype === "date-time")
          .flatMap((event) => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            const hours: number[] = [];
            for (
              let hour = eventStart.getTime();
              hour < eventEnd.getTime();
              hour += 60 * 60 * 1000
            ) {
              hours.push(hour);
            }
            return hours;
          }),
      );
      const totalHours = 2 * 7 * (24 - idealDailySleepInSeconds / 3600); // Total hours in a week, subtracting ideal sleep hours
      const busyHours = hoursWithEvents.size;
      return busyHours / totalHours;
    },
    futureBusynessFraction: async (_parent, _args, context) => {
      // Get events for the next week and calculate busyness fraction based on number of hours that have events scheduled vs total hours
      const user = context?.user ?? (await auth())?.user;
      if (!user) return null;
      const userId = user.id;
      const now = new Date();
      const oneWeekFromNow = addWeeks(now, 2);
      const events = await getUserIcalEventsBetween(userId, {
        start: now,
        end: oneWeekFromNow,
      });
      if (!events.length) return null;
      const hoursWithEvents = new Set(
        events
          // Usually all-day(datetype "date") events are more abstract, i.e. a holiday, a birthday, etc... so we exclude them from the busyness calculation since they don't necessarily reflect actual busy time slots in the calendar
          .filter((event) => event.datetype === "date-time")
          // Also exclude events that are longer than 24 hours, since they are likely not reflecting actual busy time slots in the calendar
          .filter(
            (event) =>
              differenceInHours(new Date(event.end), new Date(event.start)) <
              24,
          )
          // Transparent events are usually events that the user has marked as "free" in their calendar, so we also exclude them from the busyness calculation since they don't reflect busy time slots in the calendar
          .filter((event) => event.transparency !== "TRANSPARENT")
          .flatMap((event) => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            const hours: number[] = [];
            for (
              let hour = eventStart.getTime();
              hour < eventEnd.getTime();
              hour += 60 * 60 * 1000
            ) {
              hours.push(hour);
            }
            return hours;
          }),
      );
      const totalHours = 2 * 7 * (24 - idealDailySleepInSeconds / 3600); // Total hours in a week, subtracting ideal sleep hours
      const busyHours = hoursWithEvents.size;
      return busyHours / totalHours;
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
        (event) => ({
          ...event,
          id: event.uid,
          __typename: "Event",
          url: typeof event.url === "string" ? event.url : null,
        }),
      ),
    inboxEmailCount: async (_parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      const userGoogleAccount = await Accounts.findOne({
        userId: new ObjectId(user.id) as unknown as string,
        provider: "google",
      });
      if (!userGoogleAccount)
        throw new Error("Google account not found for user");

      // Authenticate with Google and get an authorized client.

      const oAuth2Client = new OAuth2Client({
        clientId: process.env.AUTH_GOOGLE_ID!,
        clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      });
      oAuth2Client.setCredentials({
        access_token: userGoogleAccount.access_token,
        refresh_token: userGoogleAccount.refresh_token,
        token_type: userGoogleAccount.token_type,
        scope: userGoogleAccount.scope,
        expiry_date: userGoogleAccount.expires_at,
        id_token: userGoogleAccount.id_token,
      });

      const getAccessTokenResponse = await oAuth2Client.getAccessToken();

      if (getAccessTokenResponse.token) {
        const credentials = getAccessTokenResponse.res?.data as Parameters<
          Parameters<OAuth2Client["refreshAccessToken"]>[0]
        >[1];

        // This is present when it refreshes the access token using a refresh token i think
        if (credentials && "access_token" in credentials) {
          await Accounts.updateOne(
            { providerAccountId: userGoogleAccount.providerAccountId },
            {
              $set: {
                access_token: credentials.access_token ?? undefined,
                refresh_token: credentials.refresh_token ?? undefined,
                token_type:
                  (credentials.token_type as
                    | Lowercase<string>
                    | null
                    | undefined) ?? undefined,
                scope: credentials.scope ?? undefined,
                expires_at: credentials.expiry_date ?? undefined,
                id_token: credentials.id_token ?? undefined,
              },
            },
          );
        } else {
          await Accounts.updateOne(
            { providerAccountId: userGoogleAccount.providerAccountId },
            { $set: { access_token: getAccessTokenResponse.token } },
          );
        }
      }

      const gm = gmail({ version: "v1", auth: oAuth2Client });

      const { data } = await gm.users.messages.list({
        userId: "me",
        q: "in:inbox",
      });

      return data.resultSizeEstimate ?? null;
    },
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
          startedAt: { $lte: new Date(args.interval.end) },
          endedAt: { $gte: new Date(args.interval.start) },
        }).toArray()
      ).map(
        (sleep) =>
          ({
            ...sleep,
            deviceId: sleep.hash_deviceid,
            id: String(sleep.id),
            totalSleepTime: sleep.data.total_sleep_time,
            __typename: "Sleep",
          }) satisfies GQSleep,
      );
    },
    foodEntries: async (_parent, args, context) => {
      const user = context?.user ?? (await auth())?.user;
      const foodEntries: GQFoodEntry[] = [];

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
    exerciseStats: async (parent) => {
      const exerciseStats = await WorkoutExercisesView.find({
        userId: parent.id,
        deletedAt: { $exists: false },
      }).toArray();

      return exerciseStats.map((exerciseStat) => ({
        id: `${exerciseStat.userId}-${exerciseStat.exerciseId}`,
        ...exerciseStat,
        __typename: "ExerciseStat",
      }));
    },
    workout: async (parent, args) => {
      const workout = await MaterializedWorkoutsView.findOne({
        userId: parent.id,
        id: args.id,
        deletedAt: { $exists: false },
      });

      if (!workout) return null;

      return {
        ...workout,
        location: undefined,
        exercises: workout.exercises.map(
          (exercise) =>
            ({
              ...exercise,
              __typename: "WorkoutExercise",
              // This will be resolved in the WorkoutExercise.exerciseInfo resolver, I don't know how to make the type system understand that
              exerciseInfo: undefined as unknown as GQExerciseInfo,
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
                        }) satisfies GQWorkoutSetInput,
                    ),
                    meta:
                      set.meta &&
                      Object.entries(set.meta || {}).map(
                        ([key, value]) =>
                          ({
                            key,
                            value: String(value),
                            __typename: "WorkoutSetMeta",
                          }) satisfies GQWorkoutSetMeta,
                      ),
                  }) satisfies GQWorkoutSet,
              ),
            }) satisfies GQWorkoutExercise,
        ),
        // The _id field of the MaterializedWorkoutsView is different from the Workouts document _ID
        id: workout.id || workout._id.toString(),
        __typename: "Workout",
      } satisfies GQWorkout;
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
                  exerciseInfo: undefined as unknown as GQExerciseInfo,
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
                            }) satisfies GQWorkoutSetInput,
                        ),
                        meta:
                          set.meta &&
                          Object.entries(set.meta || {}).map(
                            ([key, value]) =>
                              ({
                                key,
                                value: String(value),
                                __typename: "WorkoutSetMeta",
                              }) satisfies GQWorkoutSetMeta,
                          ),
                      }) satisfies GQWorkoutSet,
                  ),
                }) satisfies GQWorkoutExercise,
            ),
            // The _id field of the MaterializedWorkoutsView is different from the Workouts document _ID
            id: workout.id || workout._id.toString(),
            __typename: "Workout",
          }) satisfies GQWorkout,
      ),
    nextSets: async (parent, args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) return [];
      const exerciseSchedules = user.exerciseSchedules?.filter(
        (s) =>
          s.enabled &&
          (args.exerciseIds ? args.exerciseIds.includes(s.exerciseId) : true),
      );
      if (!exerciseSchedules?.length) return [];

      const nextSetsRaw = await getNextSets(user.id, exerciseSchedules, {
        asOf: args.asOf,
      });
      return nextSetsRaw.map((nextSet) => ({
        ...nextSet,
        __typename: "NextSet",
        nextWorkingSetInputs: nextSet.nextWorkingSetInputs?.map((input) => ({
          ...input,
          __typename: "WorkoutSetInput",
        })),
        exerciseSchedule: {
          ...nextSet.exerciseSchedule,
          __typename: "ExerciseSchedule",
          frequency: {
            ...nextSet.exerciseSchedule.frequency,
            __typename: "Duration",
          },
          // This will be resolved in the WorkoutExercise.exerciseInfo resolver, I don't know how to make the type system understand that
          exerciseInfo: undefined as unknown as GQExerciseInfo,
        },
      }));
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
      } satisfies GQCreateTodoPayload;

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
      } satisfies GQUpdateTodoPayload;

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
      const snoozedUntil =
        args.input.snoozedUntil && max([args.input.snoozedUntil, new Date()]);

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
          // This will be resolved in the WorkoutExercise.exerciseInfo resolver, I don't know how to make the type system understand that
          exerciseInfo: undefined as unknown as GQExerciseInfo,
        },
      } satisfies GQSnoozeExerciseSchedulePayload;
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
          // This will be resolved in the WorkoutExercise.exerciseInfo resolver, I don't know how to make the type system understand that
          exerciseInfo: undefined as unknown as GQExerciseInfo,
        },
      } satisfies GQUnsnoozeExerciseSchedulePayload;
    },
    createWorkout: async (_parent, args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      const workoutData = args.input.data;

      const insertResult = await Workouts.insertOne({
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...workoutData,
        workedOutAt: new Date(workoutData.workedOutAt),
        source: workoutData.source as unknown as WorkoutData["source"],
        exercises: workoutData.exercises?.map((exercise) => ({
          ...omitUndefined(exercise),
          sets: exercise.sets.map((set) => ({
            ...omitUndefined(set),
            inputs: set.inputs.map((input) => ({
              ...omitUndefined(input),
              value: input.value ?? NaN,
              unit: input.unit as unknown as Unit,
              assistType: input.assistType as unknown as AssistType,
            })),
            meta:
              set.meta &&
              set.meta.reduce((acc, { key, value }) => {
                acc[key] = value;
                return acc;
              }, {}),
          })),
        })),
      } satisfies Omit<WorkoutData, "id">);

      if (!insertResult.insertedId) {
        throw new Error("Failed to create workout");
      }

      const newWorkout = await Workouts.findOne({
        _id: insertResult.insertedId,
      });

      if (!newWorkout) {
        throw new Error("Failed to retrieve newly created workout");
      }

      for await (const _ of materializeIoWorkouts(user)) {
      }

      const createdWorkout = await MaterializedWorkoutsView.findOne({
        id: newWorkout._id.toString(),
        userId: user.id,
      });

      if (!createdWorkout) {
        throw new Error("Workout not found after creation");
      }

      return {
        __typename: "UpdateWorkoutPayload",
        workout: {
          __typename: "Workout",
          ...createdWorkout,
          location: undefined,
          exercises: createdWorkout.exercises.map(
            (exercise) =>
              ({
                ...exercise,
                __typename: "WorkoutExercise",
                exerciseInfo: undefined as unknown as GQExerciseInfo,
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
                          }) satisfies GQWorkoutSetInput,
                      ),
                      meta:
                        set.meta &&
                        Object.entries(set.meta || {}).map(
                          ([key, value]) =>
                            ({
                              key,
                              value: String(value),
                              __typename: "WorkoutSetMeta",
                            }) satisfies GQWorkoutSetMeta,
                        ),
                    }) satisfies GQWorkoutSet,
                ),
              }) satisfies GQWorkoutExercise,
          ),
          id: createdWorkout.id || createdWorkout._id.toString(),
        },
      };
    },
    updateWorkout: async (_parent, args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      const workoutId = args.input.id;

      if (!workoutId) {
        throw new Error("workoutId is required");
      }

      const inputData = omitUndefined(args.input.data);

      const updateResult = await Workouts.updateOne(
        { _id: new ObjectId(workoutId), userId: user.id },
        {
          $set: {
            ...inputData,
            updatedAt: new Date(),
            workedOutAt: inputData.workedOutAt
              ? new Date(inputData.workedOutAt)
              : undefined,
            source: inputData.source as unknown as WorkoutData["source"],
            exercises: inputData.exercises?.map((exercise) => ({
              ...omitUndefined(exercise),
              sets: exercise.sets.map((set) => ({
                ...omitUndefined(set),
                inputs: set.inputs.map((input) => ({
                  ...omitUndefined(input),
                  value: input.value ?? NaN,
                  unit: input.unit as unknown as Unit,
                  assistType: input.assistType as unknown as AssistType,
                })),
                meta:
                  set.meta &&
                  set.meta.reduce((acc, { key, value }) => {
                    acc[key] = value;
                    return acc;
                  }, {}),
              })),
            })),
          } satisfies Partial<Omit<WorkoutData, "createdAt" | "userId">>,
        },
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
                exerciseInfo: undefined as unknown as GQExerciseInfo,
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
                          }) satisfies GQWorkoutSetInput,
                      ),
                      meta:
                        set.meta &&
                        Object.entries(set.meta || {}).map(
                          ([key, value]) =>
                            ({
                              key,
                              value: String(value),
                              __typename: "WorkoutSetMeta",
                            }) satisfies GQWorkoutSetMeta,
                        ),
                    }) satisfies GQWorkoutSet,
                ),
              }) satisfies GQWorkoutExercise,
          ),
          id: updatedWorkout.id || updatedWorkout._id.toString(),
        },
      };
    },
    updateWorkoutWorkedOutAt: async (_parent, args, context) => {
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
                exerciseInfo: undefined as unknown as GQExerciseInfo,
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
                          }) satisfies GQWorkoutSetInput,
                      ),
                      meta:
                        set.meta &&
                        Object.entries(set.meta || {}).map(
                          ([key, value]) =>
                            ({
                              key,
                              value: String(value),
                              __typename: "WorkoutSetMeta",
                            }) satisfies GQWorkoutSetMeta,
                        ),
                    }) satisfies GQWorkoutSet,
                ),
              }) satisfies GQWorkoutExercise,
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
  Location: {
    mostRecentVisit: async (parent) => {
      if (!parent.id) return null;
      return (
        (
          await WorkoutLocationsView.findOne(
            { "_id.locationId": parent.id },
            { sort: { workedOutAt: -1 } },
          )
        )?.mostRecentVisit ?? null
      );
    },
    visitCount: async (parent) => {
      if (!parent.id) return null;
      return (
        (
          await WorkoutLocationsView.findOne(
            { "_id.locationId": parent.id },
            { sort: { workedOutAt: -1 } },
          )
        )?.visitCount ?? null
      );
    },
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
    exerciseInfo(parent) {
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
      } satisfies GQExerciseInfo;
    },
  },
  WorkoutSetInput: {
    value: (parent) =>
      typeof parent.value === "number" && !Number.isNaN(parent.value)
        ? parent.value
        : null,
  },
  ExerciseSchedule: {
    exerciseInfo(parent) {
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
      } satisfies GQExerciseInfo;
    },
    nextSet: async (parent, _args, context) => {
      const user = context?.user ?? (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      if (!parent.enabled) return null;

      const [nextSet] = await getNextSets(user.id, [parent]);

      if (!nextSet) return null;
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
          // This will be resolved in the WorkoutExercise.exerciseInfo resolver, I don't know how to make the type system understand that
          exerciseInfo: undefined as unknown as GQExerciseInfo,
        },
        __typename: "NextSet",
      } satisfies GQNextSet;
    },
  },
};

export const typeDefs = gql`
  scalar Date
  scalar JSON
  scalar JSONObject

  type Query {
    hello: String
    user: User
  }

  input TodoInput {
    summary: String
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

  input UpdateWorkoutWorkedOutAtInput {
    id: ID!
    data: UpdateWorkoutWorkedOutAtDataInput!
  }
  input UpdateWorkoutWorkedOutAtDataInput {
    workedOutAt: Date!
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
    source: String
    exercises: [UpdateWorkoutDataExercisesInput!]!
  }
  input UpdateWorkoutDataExercisesInput {
    exerciseId: Int!
    displayName: String
    comment: String
    sets: [UpdateWorkoutDataWorkoutSetInput!]!
  }

  input UpdateWorkoutDataWorkoutSetInput {
    createdAt: Date
    updatedAt: Date
    inputs: [UpdateWorkoutDataWorkoutSetInputInput!]!
    meta: [UpdateWorkoutDataWorkoutSetMetaInput!]
    comment: String
  }
  input UpdateWorkoutDataWorkoutSetMetaInput {
    key: String!
    value: String!
  }
  input UpdateWorkoutDataWorkoutSetInputInput {
    unit: String
    value: Float
    # "weighted" or "assisted"
    assistType: String
  }

  input CreateWorkoutInput {
    data: CreateWorkoutDataInput!
  }

  input CreateWorkoutDataInput {
    workedOutAt: Date!
    locationId: String
    source: String
    exercises: [CreateWorkoutDataExercisesInput!]!
  }
  input CreateWorkoutDataExercisesInput {
    exerciseId: Int!
    displayName: String
    comment: String
    sets: [CreateWorkoutDataWorkoutSetInput!]!
  }

  input CreateWorkoutDataWorkoutSetInput {
    createdAt: Date
    updatedAt: Date
    inputs: [CreateWorkoutDataWorkoutSetInputInput!]!
    meta: [CreateWorkoutDataWorkoutSetMetaInput!]
    comment: String
  }
  input CreateWorkoutDataWorkoutSetMetaInput {
    key: String!
    value: String!
  }
  input CreateWorkoutDataWorkoutSetInputInput {
    unit: String
    value: Float
    # "weighted" or "assisted"
    assistType: String
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

    createWorkout(input: CreateWorkoutInput!): UpdateWorkoutPayload
    updateWorkout(input: UpdateWorkoutInput!): UpdateWorkoutPayload
    updateWorkoutWorkedOutAt(
      input: UpdateWorkoutWorkedOutAtInput!
    ): UpdateWorkoutPayload
  }

  input IntervalInput {
    start: Date!
    end: Date!
  }

  type FloatTimeSeriesEntry {
    timestamp: Date!
    value: Float!
  }

  interface JournalEntry {
    id: ID!
  }

  union JournalEntryUnion = Todo | Event | Workout | Sleep | NextSet

  type User {
    id: ID!
    name: String!
    email: String
    image: String!
    emailVerified: Boolean
    timeZone: String
    locations: [Location!]
    journalEntries(
      dayDate: String!
      daysBefore: Int
      daysAfter: Int
    ): [JournalEntry!]
    todos(interval: IntervalInput): [Todo!]
    events(interval: IntervalInput!): [Event!]
    workouts(interval: IntervalInput!): [Workout!]
    workout(id: ID!): Workout
    nextSets(exerciseIds: [Int!], asOf: Date): [NextSet!]
    exerciseSchedules: [ExerciseSchedule!]
    exerciseStats: [ExerciseStat!]
    foodEntries(interval: IntervalInput!): [FoodEntry!]
    sleeps(interval: IntervalInput!): [Sleep!]
    weight: Float
    weightTimeSeries: [FloatTimeSeriesEntry!]
    fatRatio: Float
    fatRatioTimeSeries: [FloatTimeSeriesEntry!]
    sleepDebt: Float
    sleepDebtFraction: Float
    sleepDebtFractionTimeSeries: [FloatTimeSeriesEntry!]
    availableBalance: Float
    pastBusynessFraction: Float
    futureBusynessFraction: Float
    inboxEmailCount: Int
    dataSources: [UserDataSource!]
  }

  type UserDataSource {
    id: ID!
    name: String!
    paused: Boolean
    createdAt: Date!
    updatedAt: Date!
    lastAttemptedAt: Date
    lastSyncedAt: Date
    lastSuccessfulAt: Date
    lastSuccessfulRuntime: Float
    lastResult: String
    lastFailedAt: Date
    lastFailedRuntime: Float
    lastError: String
    source: String!
    # Pass this around as JSON because doing a Record in GraphQL is painful
    config: JSON
  }

  type Sleep implements JournalEntry {
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
    nextSet: NextSet
  }

  type NextSet implements JournalEntry {
    # This is just the schedule entry ID prefixed with "next-", so normalizing works
    id: ID!
    lastWorkedOutAt: Date
    dueOn: Date!
    exerciseId: Int!
    successful: Boolean
    nextWorkingSets: Int
    nextWorkingSetInputs: [WorkoutSetInput!]
    exerciseSchedule: ExerciseSchedule!
  }

  type Todo implements JournalEntry {
    id: ID!
    created: Date
    summary: String
    due: Date
    completed: Date
  }

  type Event implements JournalEntry {
    id: ID!
    created: Date
    summary: String
    start: Date!
    end: Date!
    due: Date
    datetype: String!
    location: String
    url: String
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
    visitCount: Int
    mostRecentVisit: Date
  }

  type BoulderCircuit {
    id: ID!
    name: String!
    createdAt: Date!
    updatedAt: Date!
    deletedAt: Date
    description: String
    holdColor: String
    holdColorSecondary: String
    labelColor: String
    gradeEstimate: Float
    gradeRange: [Float]
    hasZones: Boolean
  }

  type Workout implements JournalEntry {
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

  type ExerciseStat {
    id: ID!
    exerciseId: Int!
    # totalVolume: Float
    # totalReps: Float
    # totalSets: Float
    # maxWeight: Float
    # maxReps: Float
    # maxSets: Float
    workedOutAt: Date!
    exerciseCount: Int!
    monthlyCount: Int!
    quarterlyCount: Int!
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

export const dynamic = "force-dynamic";
