import { tz } from "@date-fns/tz";
import { makeExecutableSchema } from "@graphql-tools/schema";
import * as Ably from "ably";
import { ObjectId } from "bson";
import { isValid, startOfDay } from "date-fns";
import {
  DocumentNode,
  GraphQLScalarType,
  Kind,
  OperationDefinitionNode,
  print,
} from "graphql";
import gql from "graphql-tag";
import { auth } from "./auth";
import type { FoodEntry, Resolvers } from "./graphql.generated";
import type { MongoVTodo } from "./lib";
import { Locations } from "./models/location.server";
import { Users } from "./models/user.server";
import { WorkoutSource } from "./models/workout";
import { getNextSet, MaterializedWorkoutsView } from "./models/workout.server";
import {
  getUserIcalEventsBetween,
  getUserIcalTodosBetween,
} from "./sources/ical";
import { IcalEvents } from "./sources/ical.server";
import { MyFitnessPalFoodEntries } from "./sources/myfitnesspal.server";
import { DataSource } from "./sources/utils";
import { pick, rangeToQuery } from "./utils";

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

export const resolvers: Resolvers = {
  Date: dateScalar,
  Query: {
    hello: () => "worlasdd",
    user: async () => {
      const user = (await auth())?.user;

      if (!user) return null;

      return {
        ...user,
        __typename: "User",
        exerciseSchedules:
          user.exerciseSchedules?.map((schedule) => ({
            ...schedule,
            __typename: "ExerciseSchedule",
            frequency: { ...schedule.frequency, __typename: "Duration" },
          })) || null,
      };
    },
  },
  User: {
    todos: async (_parent, args) => {
      const user = (await auth())?.user;

      if (!user) return [];

      return (
        await getUserIcalTodosBetween(user.id, args.interval ?? undefined)
      ).map((todo) => ({ ...todo, id: todo.uid, __typename: "Todo" }));
    },
    events: async (_parent, args) => {
      const user = (await auth())?.user;

      if (!user) return [];

      return (await getUserIcalEventsBetween(user.id, args.interval)).map(
        (event) => ({ ...event, id: event.uid, __typename: "Event" }),
      );
    },
    foodEntries: async (_parent, args) => {
      const user = (await auth())?.user;

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
    workouts: async (_parent, args) => {
      const user = (await auth())?.user;

      if (!user) return [];

      return (
        await MaterializedWorkoutsView.find(
          {
            userId: user.id,
            $or: [
              {
                workedOutAt: rangeToQuery(
                  args.interval.start,
                  args.interval.end,
                ),
              },
              // All-Day workouts are stored with workedOutAt at UTC 00:00 of the day
              {
                workedOutAt: startOfDay(args.interval.start, { in: tz("UTC") }),
              },
            ],
            deletedAt: { $exists: false },
          },
          { sort: { workedOutAt: -1 } },
        ).toArray()
      ).map(async (workout) => {
        const location = workout.locationId
          ? await Locations.findOne({
              _id: new ObjectId(workout.locationId),
              userId: user.id,
            })
          : null;

        return {
          ...workout,
          location: location
            ? {
                ...location,
                boulderCircuits: location.boulderCircuits?.map((circuit) => ({
                  ...circuit,
                  __typename: "BoulderCircuit",
                })),
                __typename: "Location",
                id: String(location._id),
              }
            : null,
          exercises: workout.exercises.map((exercise) => ({
            ...exercise,
            __typename: "WorkoutExercise",
            sets: exercise.sets.map((set) => ({
              ...set,
              __typename: "WorkoutSet",
              inputs: set.inputs.map((input) => ({
                ...input,
                __typename: "WorkoutSetInput",
              })),
              meta:
                set.meta &&
                Object.entries(set.meta || {}).map(([key, value]) => ({
                  key,
                  value: String(value),
                  __typename: "WorkoutSetMeta",
                })),
            })),
          })),
          // The _id field of the MaterializedWorkoutsView is different from the Workouts document _ID
          id: workout.id || workout._id.toString(),
          __typename: "Workout",
        };
      });
    },
  },
  Mutation: {
    createTodo: async (_parent, args, _context, info) => {
      const user = (await auth())?.user;
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
    updateTodo: async (_parent, args, _context, info) => {
      const user = (await auth())?.user;
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
    deleteTodo: async (_parent, args, _context, info) => {
      const user = (await auth())?.user;
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
    snoozeExerciseSchedule: async (_parent, args, _context) => {
      const user = (await auth())?.user;
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
      };
    },
    unsnoozeExerciseSchedule: async (_parent, args, _context) => {
      const user = (await auth())?.user;
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
  WorkoutSetInput: {
    value: (parent) =>
      typeof parent.value === "number" && !Number.isNaN(parent.value)
        ? parent.value
        : null,
  },
  ExerciseSchedule: {
    nextSet: async (parent, _args, _context) => {
      const user = (await auth())?.user;
      if (!user) throw new Error("Unauthorized");

      if (!parent.enabled) return null;

      const nextSet = await getNextSet({
        userId: user.id,
        scheduleEntry: parent,
      });

      return {
        ...nextSet,
        nextWorkingSetInputs:
          nextSet.nextWorkingSetInputs?.map((input) => ({
            ...input,
            __typename: "WorkoutSetInput",
          })) || null,
        scheduleEntry: {
          ...nextSet.scheduleEntry,
          __typename: "ExerciseSchedule",
          frequency: {
            ...nextSet.scheduleEntry.frequency,
            __typename: "Duration",
          },
        },
        __typename: "NextSet",
      };
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
    id: String!
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
  }

  input IntervalInput {
    start: Date!
    end: Date!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    image: String!
    emailVerified: Boolean!
    timeZone: String
    todos(interval: IntervalInput): [Todo!]
    events(interval: IntervalInput!): [Event!]
    workouts(interval: IntervalInput!): [Workout!]
    exerciseSchedules: [ExerciseSchedule!]
    foodEntries(interval: IntervalInput!): [FoodEntry!]
    # dataSources: [UserDataSource!]
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
    workedOutAt: Date
    dueOn: Date!
    exerciseId: Int!
    successful: Boolean
    nextWorkingSets: Int
    nextWorkingSetInputs: [WorkoutSetInput!]
    scheduleEntry: ExerciseSchedule!
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
    sets: [WorkoutSet!]!
    displayName: String
    comment: String
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
