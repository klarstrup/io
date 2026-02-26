import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: Date; output: Date; }
  JSON: { input: unknown; output: unknown; }
  JSONObject: { input: Record<string, unknown>; output: Record<string, unknown>; }
};

export type GQBoulderCircuit = {
  __typename: 'BoulderCircuit';
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  gradeEstimate?: Maybe<Scalars['Float']['output']>;
  gradeRange?: Maybe<Array<Maybe<Scalars['Float']['output']>>>;
  hasZones?: Maybe<Scalars['Boolean']['output']>;
  holdColor?: Maybe<Scalars['String']['output']>;
  holdColorSecondary?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  labelColor?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type GQCaloriesUnit = {
  __typename: 'CaloriesUnit';
  unit: Scalars['String']['output'];
  value: Scalars['Float']['output'];
};

export type GQCreateTodoInput = {
  data: GQTodoInput;
};

export type GQCreateTodoPayload = {
  __typename: 'CreateTodoPayload';
  todo?: Maybe<GQTodo>;
};

export type GQDuration = {
  __typename: 'Duration';
  days?: Maybe<Scalars['Float']['output']>;
  hours?: Maybe<Scalars['Float']['output']>;
  minutes?: Maybe<Scalars['Float']['output']>;
  months?: Maybe<Scalars['Float']['output']>;
  seconds?: Maybe<Scalars['Float']['output']>;
  weeks?: Maybe<Scalars['Float']['output']>;
  years?: Maybe<Scalars['Float']['output']>;
};

export type GQEvent = {
  __typename: 'Event';
  created?: Maybe<Scalars['Date']['output']>;
  datetype: Scalars['String']['output'];
  due?: Maybe<Scalars['Date']['output']>;
  end: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  location?: Maybe<Scalars['String']['output']>;
  order?: Maybe<Scalars['Int']['output']>;
  start: Scalars['Date']['output'];
  summary?: Maybe<Scalars['String']['output']>;
};

export type GQExerciseInfo = {
  __typename: 'ExerciseInfo';
  aliases: Array<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  inputs: Array<GQExerciseInfoInput>;
  instructions: Array<GQExerciseInfoInstruction>;
  isHidden: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  tags?: Maybe<Array<GQExerciseInfoTag>>;
};

export type GQExerciseInfoInput = {
  __typename: 'ExerciseInfoInput';
  type: Scalars['String']['output'];
};

export type GQExerciseInfoInstruction = {
  __typename: 'ExerciseInfoInstruction';
  value: Scalars['String']['output'];
};

export type GQExerciseInfoTag = {
  __typename: 'ExerciseInfoTag';
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type GQExerciseSchedule = {
  __typename: 'ExerciseSchedule';
  baseWeight?: Maybe<Scalars['Float']['output']>;
  deloadFactor?: Maybe<Scalars['Float']['output']>;
  enabled: Scalars['Boolean']['output'];
  exerciseId: Scalars['Int']['output'];
  exerciseInfo: GQExerciseInfo;
  frequency: GQDuration;
  id: Scalars['ID']['output'];
  increment?: Maybe<Scalars['Float']['output']>;
  nextSet?: Maybe<GQNextSet>;
  order?: Maybe<Scalars['Int']['output']>;
  snoozedUntil?: Maybe<Scalars['Date']['output']>;
  workingReps?: Maybe<Scalars['Int']['output']>;
  workingSets?: Maybe<Scalars['Int']['output']>;
};

export type GQFloatTimeSeriesEntry = {
  __typename: 'FloatTimeSeriesEntry';
  timestamp: Scalars['Date']['output'];
  value: Scalars['Float']['output'];
};

export type GQFood = {
  __typename: 'Food';
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  servingSizes: Array<GQServingSize>;
};

export type GQFoodEntry = {
  __typename: 'FoodEntry';
  datetime: Scalars['Date']['output'];
  food: GQFood;
  id: Scalars['ID']['output'];
  mealName: Scalars['String']['output'];
  nutritionalContents: GQNutritionalContents;
  servingSize: GQServingSize;
  servings: Scalars['Float']['output'];
  type: Scalars['String']['output'];
};

export type GQIntervalInput = {
  end: Scalars['Date']['input'];
  start: Scalars['Date']['input'];
};

export type GQLocation = {
  __typename: 'Location';
  boulderCircuits?: Maybe<Array<GQBoulderCircuit>>;
  createdAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  isFavorite?: Maybe<Scalars['Boolean']['output']>;
  knownAddresses?: Maybe<Array<Scalars['String']['output']>>;
  name: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
  userId: Scalars['ID']['output'];
};

export type GQMutation = {
  __typename: 'Mutation';
  createTodo?: Maybe<GQCreateTodoPayload>;
  deleteTodo?: Maybe<Scalars['String']['output']>;
  snoozeExerciseSchedule?: Maybe<GQSnoozeExerciseSchedulePayload>;
  unsnoozeExerciseSchedule?: Maybe<GQUnsnoozeExerciseSchedulePayload>;
  updateTodo?: Maybe<GQUpdateTodoPayload>;
  updateWorkout?: Maybe<GQUpdateWorkoutPayload>;
};


export type GQMutationCreateTodoArgs = {
  input: GQCreateTodoInput;
};


export type GQMutationDeleteTodoArgs = {
  id: Scalars['String']['input'];
};


export type GQMutationSnoozeExerciseScheduleArgs = {
  input: GQSnoozeExerciseScheduleInput;
};


export type GQMutationUnsnoozeExerciseScheduleArgs = {
  input: GQUnsnoozeExerciseScheduleInput;
};


export type GQMutationUpdateTodoArgs = {
  input: GQUpdateTodoInput;
};


export type GQMutationUpdateWorkoutArgs = {
  input: GQUpdateWorkoutInput;
};

export type GQNextSet = {
  __typename: 'NextSet';
  dueOn: Scalars['Date']['output'];
  exerciseId: Scalars['Int']['output'];
  exerciseSchedule: GQExerciseSchedule;
  id: Scalars['ID']['output'];
  nextWorkingSetInputs?: Maybe<Array<GQWorkoutSetInput>>;
  nextWorkingSets?: Maybe<Scalars['Int']['output']>;
  successful?: Maybe<Scalars['Boolean']['output']>;
  workedOutAt?: Maybe<Scalars['Date']['output']>;
};

export type GQNutritionalContents = {
  __typename: 'NutritionalContents';
  energy: GQCaloriesUnit;
  protein?: Maybe<Scalars['Float']['output']>;
};

export type GQQuery = {
  __typename: 'Query';
  hello?: Maybe<Scalars['String']['output']>;
  user?: Maybe<GQUser>;
};

export type GQServingSize = {
  __typename: 'ServingSize';
  nutritionMultiplier: Scalars['Float']['output'];
  unit: Scalars['String']['output'];
  value: Scalars['Float']['output'];
};

export type GQSleep = {
  __typename: 'Sleep';
  deviceId: Scalars['String']['output'];
  endedAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  startedAt: Scalars['Date']['output'];
  totalSleepTime: Scalars['Float']['output'];
};

export type GQSnoozeExerciseScheduleInput = {
  exerciseScheduleId: Scalars['ID']['input'];
  snoozedUntil?: InputMaybe<Scalars['Date']['input']>;
};

export type GQSnoozeExerciseSchedulePayload = {
  __typename: 'SnoozeExerciseSchedulePayload';
  exerciseSchedule?: Maybe<GQExerciseSchedule>;
};

export type GQTodo = {
  __typename: 'Todo';
  completed?: Maybe<Scalars['Date']['output']>;
  created?: Maybe<Scalars['Date']['output']>;
  due?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  order?: Maybe<Scalars['Int']['output']>;
  start?: Maybe<Scalars['Date']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
};

export type GQTodoInput = {
  completed?: InputMaybe<Scalars['Date']['input']>;
  due?: InputMaybe<Scalars['Date']['input']>;
  start?: InputMaybe<Scalars['Date']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
};

export type GQUnsnoozeExerciseScheduleInput = {
  exerciseScheduleId: Scalars['ID']['input'];
};

export type GQUnsnoozeExerciseSchedulePayload = {
  __typename: 'UnsnoozeExerciseSchedulePayload';
  exerciseSchedule?: Maybe<GQExerciseSchedule>;
};

export type GQUpdateTodoInput = {
  data: GQTodoInput;
  id: Scalars['ID']['input'];
};

export type GQUpdateTodoPayload = {
  __typename: 'UpdateTodoPayload';
  todo?: Maybe<GQTodo>;
};

export type GQUpdateWorkoutDataInput = {
  locationId?: InputMaybe<Scalars['String']['input']>;
  workedOutAt?: InputMaybe<Scalars['Date']['input']>;
};

export type GQUpdateWorkoutInput = {
  data: GQUpdateWorkoutDataInput;
  id: Scalars['ID']['input'];
};

export type GQUpdateWorkoutPayload = {
  __typename: 'UpdateWorkoutPayload';
  workout?: Maybe<GQWorkout>;
};

export type GQUser = {
  __typename: 'User';
  availableBalance?: Maybe<Scalars['Float']['output']>;
  dataSources?: Maybe<Array<GQUserDataSource>>;
  email?: Maybe<Scalars['String']['output']>;
  emailVerified?: Maybe<Scalars['Boolean']['output']>;
  events?: Maybe<Array<GQEvent>>;
  exerciseSchedules?: Maybe<Array<GQExerciseSchedule>>;
  fatRatio?: Maybe<Scalars['Float']['output']>;
  fatRatioTimeSeries?: Maybe<Array<GQFloatTimeSeriesEntry>>;
  foodEntries?: Maybe<Array<GQFoodEntry>>;
  futureBusynessFraction?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  image: Scalars['String']['output'];
  inboxEmailCount?: Maybe<Scalars['Int']['output']>;
  locations?: Maybe<Array<GQLocation>>;
  name: Scalars['String']['output'];
  nextSets?: Maybe<Array<GQNextSet>>;
  pastBusynessFraction?: Maybe<Scalars['Float']['output']>;
  sleepDebt?: Maybe<Scalars['Float']['output']>;
  sleepDebtFraction?: Maybe<Scalars['Float']['output']>;
  sleepDebtFractionTimeSeries?: Maybe<Array<GQFloatTimeSeriesEntry>>;
  sleeps?: Maybe<Array<GQSleep>>;
  timeZone?: Maybe<Scalars['String']['output']>;
  todos?: Maybe<Array<GQTodo>>;
  weight?: Maybe<Scalars['Float']['output']>;
  weightTimeSeries?: Maybe<Array<GQFloatTimeSeriesEntry>>;
  workouts?: Maybe<Array<GQWorkout>>;
};


export type GQUserEventsArgs = {
  interval: GQIntervalInput;
};


export type GQUserFoodEntriesArgs = {
  interval: GQIntervalInput;
};


export type GQUserSleepsArgs = {
  interval: GQIntervalInput;
};


export type GQUserTodosArgs = {
  interval?: InputMaybe<GQIntervalInput>;
};


export type GQUserWorkoutsArgs = {
  interval: GQIntervalInput;
};

export type GQUserDataSource = {
  __typename: 'UserDataSource';
  config?: Maybe<Scalars['JSON']['output']>;
  createdAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  lastAttemptedAt?: Maybe<Scalars['Date']['output']>;
  lastError?: Maybe<Scalars['String']['output']>;
  lastFailedAt?: Maybe<Scalars['Date']['output']>;
  lastFailedRuntime?: Maybe<Scalars['Float']['output']>;
  lastResult?: Maybe<Scalars['String']['output']>;
  lastSuccessfulAt?: Maybe<Scalars['Date']['output']>;
  lastSuccessfulRuntime?: Maybe<Scalars['Float']['output']>;
  lastSyncedAt?: Maybe<Scalars['Date']['output']>;
  name: Scalars['String']['output'];
  paused?: Maybe<Scalars['Boolean']['output']>;
  source: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type GQWorkout = {
  __typename: 'Workout';
  createdAt: Scalars['Date']['output'];
  exercises: Array<GQWorkoutExercise>;
  id: Scalars['ID']['output'];
  location?: Maybe<GQLocation>;
  locationId?: Maybe<Scalars['String']['output']>;
  materializedAt?: Maybe<Scalars['Date']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['Date']['output'];
  workedOutAt: Scalars['Date']['output'];
};

export type GQWorkoutExercise = {
  __typename: 'WorkoutExercise';
  comment?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  exerciseId: Scalars['Int']['output'];
  exerciseInfo: GQExerciseInfo;
  sets: Array<GQWorkoutSet>;
};

export type GQWorkoutSet = {
  __typename: 'WorkoutSet';
  comment?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['Date']['output']>;
  inputs: Array<GQWorkoutSetInput>;
  meta?: Maybe<Array<GQWorkoutSetMeta>>;
  updatedAt?: Maybe<Scalars['Date']['output']>;
};

export type GQWorkoutSetInput = {
  __typename: 'WorkoutSetInput';
  assistType?: Maybe<Scalars['String']['output']>;
  unit?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['Float']['output']>;
};

export type GQWorkoutSetMeta = {
  __typename: 'WorkoutSetMeta';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type GQCalendarUserWorkoutsQueryVariables = Exact<{
  interval: GQIntervalInput;
}>;


export type GQCalendarUserWorkoutsQuery = { user?: { __typename: 'User', id: string, workouts?: Array<{ __typename: 'Workout', id: string, createdAt: Date, updatedAt: Date, workedOutAt: Date, location?: { __typename: 'Location', id: string, createdAt: Date, updatedAt: Date, name: string, userId: string, boulderCircuits?: Array<{ __typename: 'BoulderCircuit', id: string, holdColor?: string | null, gradeEstimate?: number | null, gradeRange?: Array<number | null> | null, name: string, labelColor?: string | null, hasZones?: boolean | null, description?: string | null, createdAt: Date, updatedAt: Date }> | null } | null, exercises: Array<{ __typename: 'WorkoutExercise', exerciseId: number, displayName?: string | null, comment?: string | null, exerciseInfo: { __typename: 'ExerciseInfo', id: number, aliases: Array<string>, name: string, isHidden: boolean, inputs: Array<{ __typename: 'ExerciseInfoInput', type: string }>, instructions: Array<{ __typename: 'ExerciseInfoInstruction', value: string }>, tags?: Array<{ __typename: 'ExerciseInfoTag', name: string, type: string }> | null }, sets: Array<{ __typename: 'WorkoutSet', comment?: string | null, createdAt?: Date | null, updatedAt?: Date | null, inputs: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }>, meta?: Array<{ __typename: 'WorkoutSetMeta', key: string, value: string }> | null }> }> }> | null, foodEntries?: Array<{ __typename: 'FoodEntry', id: string, datetime: Date, type: string, mealName: string, servings: number, food: { __typename: 'Food', id: string, description: string, servingSizes: Array<{ __typename: 'ServingSize', value: number, unit: string, nutritionMultiplier: number }> }, servingSize: { __typename: 'ServingSize', value: number, unit: string, nutritionMultiplier: number }, nutritionalContents: { __typename: 'NutritionalContents', protein?: number | null, energy: { __typename: 'CaloriesUnit', value: number, unit: string } } }> | null } | null };

export type GQGetLatestWeightEntryQueryVariables = Exact<{ [key: string]: never; }>;


export type GQGetLatestWeightEntryQuery = { user?: { __typename: 'User', id: string, weight?: number | null, pastBusynessFraction?: number | null, futureBusynessFraction?: number | null, sleepDebtFraction?: number | null, fatRatio?: number | null, availableBalance?: number | null, inboxEmailCount?: number | null, weightTimeSeries?: Array<{ __typename: 'FloatTimeSeriesEntry', timestamp: Date, value: number }> | null, sleepDebtFractionTimeSeries?: Array<{ __typename: 'FloatTimeSeriesEntry', timestamp: Date, value: number }> | null, fatRatioTimeSeries?: Array<{ __typename: 'FloatTimeSeriesEntry', timestamp: Date, value: number }> | null, dataSources?: Array<{ __typename: 'UserDataSource', id: string, name: string, paused?: boolean | null, createdAt: Date, updatedAt: Date, lastSyncedAt?: Date | null, lastSuccessfulAt?: Date | null, lastSuccessfulRuntime?: number | null, lastResult?: string | null, lastFailedAt?: Date | null, lastFailedRuntime?: number | null, lastAttemptedAt?: Date | null, lastError?: string | null, source: string, config?: unknown | null }> | null } | null };

export type GQDiaryAgendaDayUserQueryVariables = Exact<{ [key: string]: never; }>;


export type GQDiaryAgendaDayUserQuery = { user?: { __typename: 'User', id: string, name: string, email?: string | null, image: string, emailVerified?: boolean | null, timeZone?: string | null, dataSources?: Array<{ __typename: 'UserDataSource', id: string, name: string, paused?: boolean | null, createdAt: Date, updatedAt: Date, lastSyncedAt?: Date | null, lastSuccessfulAt?: Date | null, lastSuccessfulRuntime?: number | null, lastResult?: string | null, lastFailedAt?: Date | null, lastFailedRuntime?: number | null, lastAttemptedAt?: Date | null, lastError?: string | null, source: string, config?: unknown | null }> | null, exerciseSchedules?: Array<{ __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null } }> | null } | null };

export type GQDiaryAgendaDayUserTodosQueryVariables = Exact<{
  interval: GQIntervalInput;
}>;


export type GQDiaryAgendaDayUserTodosQuery = { user?: { __typename: 'User', id: string, locations?: Array<{ __typename: 'Location', id: string, createdAt: Date, updatedAt: Date, name: string, userId: string, knownAddresses?: Array<string> | null, boulderCircuits?: Array<{ __typename: 'BoulderCircuit', id: string, holdColor?: string | null, gradeEstimate?: number | null, gradeRange?: Array<number | null> | null, name: string, labelColor?: string | null, hasZones?: boolean | null, description?: string | null, createdAt: Date, updatedAt: Date }> | null }> | null, sleeps?: Array<{ __typename: 'Sleep', id: string, startedAt: Date, endedAt: Date, totalSleepTime: number, deviceId: string }> | null, nextSets?: Array<{ __typename: 'NextSet', id: string, workedOutAt?: Date | null, dueOn: Date, exerciseId: number, successful?: boolean | null, nextWorkingSets?: number | null, nextWorkingSetInputs?: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }> | null, exerciseSchedule: { __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, exerciseInfo: { __typename: 'ExerciseInfo', id: number, aliases: Array<string>, name: string, isHidden: boolean, inputs: Array<{ __typename: 'ExerciseInfoInput', type: string }>, instructions: Array<{ __typename: 'ExerciseInfoInstruction', value: string }>, tags?: Array<{ __typename: 'ExerciseInfoTag', name: string, type: string }> | null }, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null } } }> | null, todos?: Array<{ __typename: 'Todo', id: string, created?: Date | null, summary?: string | null, start?: Date | null, due?: Date | null, completed?: Date | null, order?: number | null }> | null, events?: Array<{ __typename: 'Event', id: string, created?: Date | null, summary?: string | null, start: Date, end: Date, datetype: string, location?: string | null, order?: number | null }> | null, workouts?: Array<{ __typename: 'Workout', id: string, createdAt: Date, updatedAt: Date, workedOutAt: Date, materializedAt?: Date | null, locationId?: string | null, source?: string | null, exercises: Array<{ __typename: 'WorkoutExercise', exerciseId: number, displayName?: string | null, comment?: string | null, exerciseInfo: { __typename: 'ExerciseInfo', id: number, aliases: Array<string>, name: string, isHidden: boolean, inputs: Array<{ __typename: 'ExerciseInfoInput', type: string }>, instructions: Array<{ __typename: 'ExerciseInfoInstruction', value: string }>, tags?: Array<{ __typename: 'ExerciseInfoTag', name: string, type: string }> | null }, sets: Array<{ __typename: 'WorkoutSet', comment?: string | null, createdAt?: Date | null, updatedAt?: Date | null, inputs: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }>, meta?: Array<{ __typename: 'WorkoutSetMeta', key: string, value: string }> | null }> }> }> | null } | null };

export type GQCreateTodoMutationVariables = Exact<{
  input: GQCreateTodoInput;
}>;


export type GQCreateTodoMutation = { createTodo?: { __typename: 'CreateTodoPayload', todo?: { __typename: 'Todo', id: string, created?: Date | null, summary?: string | null, start?: Date | null, due?: Date | null, completed?: Date | null } | null } | null };

export type GQSnoozeExerciseScheduleMutationVariables = Exact<{
  input: GQSnoozeExerciseScheduleInput;
}>;


export type GQSnoozeExerciseScheduleMutation = { snoozeExerciseSchedule?: { __typename: 'SnoozeExerciseSchedulePayload', exerciseSchedule?: { __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null }, nextSet?: { __typename: 'NextSet', id: string, workedOutAt?: Date | null, dueOn: Date, exerciseId: number, successful?: boolean | null, nextWorkingSets?: number | null, nextWorkingSetInputs?: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }> | null, exerciseSchedule: { __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null } } } | null } | null } | null };

export type GQUnsnoozeExerciseScheduleMutationVariables = Exact<{
  input: GQUnsnoozeExerciseScheduleInput;
}>;


export type GQUnsnoozeExerciseScheduleMutation = { unsnoozeExerciseSchedule?: { __typename: 'UnsnoozeExerciseSchedulePayload', exerciseSchedule?: { __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null }, nextSet?: { __typename: 'NextSet', id: string, workedOutAt?: Date | null, dueOn: Date, exerciseId: number, successful?: boolean | null, nextWorkingSets?: number | null, nextWorkingSetInputs?: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }> | null, exerciseSchedule: { __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null } } } | null } | null } | null };

export type GQDiaryAgendaDayTodoFragment = { __typename: 'Todo', id: string, start?: Date | null, due?: Date | null, completed?: Date | null, summary?: string | null };

export type GQUpdateTodoMutationVariables = Exact<{
  input: GQUpdateTodoInput;
}>;


export type GQUpdateTodoMutation = { updateTodo?: { __typename: 'UpdateTodoPayload', todo?: { __typename: 'Todo', id: string, created?: Date | null, start?: Date | null, due?: Date | null, completed?: Date | null, summary?: string | null } | null } | null };

export type GQDeleteTodoMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GQDeleteTodoMutation = { deleteTodo?: string | null };

export type GQDiaryAgendaFoodQueryVariables = Exact<{
  interval: GQIntervalInput;
}>;


export type GQDiaryAgendaFoodQuery = { user?: { __typename: 'User', id: string, foodEntries?: Array<{ __typename: 'FoodEntry', id: string, datetime: Date, mealName: string, type: string, servings: number, nutritionalContents: { __typename: 'NutritionalContents', protein?: number | null, energy: { __typename: 'CaloriesUnit', value: number, unit: string } }, food: { __typename: 'Food', id: string, description: string, servingSizes: Array<{ __typename: 'ServingSize', unit: string, value: number, nutritionMultiplier: number }> }, servingSize: { __typename: 'ServingSize', unit: string, value: number, nutritionMultiplier: number } }> | null } | null };

export type GQUpdateWorkoutMutationVariables = Exact<{
  input: GQUpdateWorkoutInput;
}>;


export type GQUpdateWorkoutMutation = { updateWorkout?: { __typename: 'UpdateWorkoutPayload', workout?: { __typename: 'Workout', id: string, createdAt: Date, updatedAt: Date, workedOutAt: Date, materializedAt?: Date | null, locationId?: string | null, source?: string | null, exercises: Array<{ __typename: 'WorkoutExercise', exerciseId: number, displayName?: string | null, comment?: string | null, exerciseInfo: { __typename: 'ExerciseInfo', id: number, aliases: Array<string>, name: string, isHidden: boolean, inputs: Array<{ __typename: 'ExerciseInfoInput', type: string }>, instructions: Array<{ __typename: 'ExerciseInfoInstruction', value: string }>, tags?: Array<{ __typename: 'ExerciseInfoTag', name: string, type: string }> | null }, sets: Array<{ __typename: 'WorkoutSet', comment?: string | null, createdAt?: Date | null, updatedAt?: Date | null, inputs: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }>, meta?: Array<{ __typename: 'WorkoutSetMeta', key: string, value: string }> | null }> }> } | null } | null };

export type GQWorkoutFormNextSetsQueryVariables = Exact<{ [key: string]: never; }>;


export type GQWorkoutFormNextSetsQuery = { user?: { __typename: 'User', id: string, timeZone?: string | null, nextSets?: Array<{ __typename: 'NextSet', id: string, workedOutAt?: Date | null, dueOn: Date, exerciseId: number, successful?: boolean | null, nextWorkingSets?: number | null, nextWorkingSetInputs?: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }> | null, exerciseSchedule: { __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, exerciseInfo: { __typename: 'ExerciseInfo', id: number, aliases: Array<string>, name: string, isHidden: boolean, inputs: Array<{ __typename: 'ExerciseInfoInput', type: string }>, instructions: Array<{ __typename: 'ExerciseInfoInstruction', value: string }>, tags?: Array<{ __typename: 'ExerciseInfoTag', name: string, type: string }> | null }, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null } } }> | null } | null };

export type GQListPageUserQueryVariables = Exact<{ [key: string]: never; }>;


export type GQListPageUserQuery = { user?: { __typename: 'User', id: string, todos?: Array<{ __typename: 'Todo', id: string, created?: Date | null, start?: Date | null, due?: Date | null, completed?: Date | null, summary?: string | null }> | null } | null };

export type GQSourceWidgetQueryVariables = Exact<{ [key: string]: never; }>;


export type GQSourceWidgetQuery = { user?: { __typename: 'User', id: string, dataSources?: Array<{ __typename: 'UserDataSource', id: string, name: string, paused?: boolean | null, createdAt: Date, updatedAt: Date, lastSyncedAt?: Date | null, lastSuccessfulAt?: Date | null, lastSuccessfulRuntime?: number | null, lastResult?: string | null, lastFailedAt?: Date | null, lastFailedRuntime?: number | null, lastAttemptedAt?: Date | null, lastError?: string | null, source: string, config?: unknown | null }> | null } | null };



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type GQResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BoulderCircuit: ResolverTypeWrapper<GQBoulderCircuit>;
  CaloriesUnit: ResolverTypeWrapper<GQCaloriesUnit>;
  CreateTodoInput: GQCreateTodoInput;
  CreateTodoPayload: ResolverTypeWrapper<GQCreateTodoPayload>;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  Duration: ResolverTypeWrapper<GQDuration>;
  Event: ResolverTypeWrapper<GQEvent>;
  ExerciseInfo: ResolverTypeWrapper<GQExerciseInfo>;
  ExerciseInfoInput: ResolverTypeWrapper<GQExerciseInfoInput>;
  ExerciseInfoInstruction: ResolverTypeWrapper<GQExerciseInfoInstruction>;
  ExerciseInfoTag: ResolverTypeWrapper<GQExerciseInfoTag>;
  ExerciseSchedule: ResolverTypeWrapper<GQExerciseSchedule>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  FloatTimeSeriesEntry: ResolverTypeWrapper<GQFloatTimeSeriesEntry>;
  Food: ResolverTypeWrapper<GQFood>;
  FoodEntry: ResolverTypeWrapper<GQFoodEntry>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  IntervalInput: GQIntervalInput;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  JSONObject: ResolverTypeWrapper<Scalars['JSONObject']['output']>;
  Location: ResolverTypeWrapper<GQLocation>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  NextSet: ResolverTypeWrapper<GQNextSet>;
  NutritionalContents: ResolverTypeWrapper<GQNutritionalContents>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  ServingSize: ResolverTypeWrapper<GQServingSize>;
  Sleep: ResolverTypeWrapper<GQSleep>;
  SnoozeExerciseScheduleInput: GQSnoozeExerciseScheduleInput;
  SnoozeExerciseSchedulePayload: ResolverTypeWrapper<GQSnoozeExerciseSchedulePayload>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Todo: ResolverTypeWrapper<GQTodo>;
  TodoInput: GQTodoInput;
  UnsnoozeExerciseScheduleInput: GQUnsnoozeExerciseScheduleInput;
  UnsnoozeExerciseSchedulePayload: ResolverTypeWrapper<GQUnsnoozeExerciseSchedulePayload>;
  UpdateTodoInput: GQUpdateTodoInput;
  UpdateTodoPayload: ResolverTypeWrapper<GQUpdateTodoPayload>;
  UpdateWorkoutDataInput: GQUpdateWorkoutDataInput;
  UpdateWorkoutInput: GQUpdateWorkoutInput;
  UpdateWorkoutPayload: ResolverTypeWrapper<GQUpdateWorkoutPayload>;
  User: ResolverTypeWrapper<GQUser>;
  UserDataSource: ResolverTypeWrapper<GQUserDataSource>;
  Workout: ResolverTypeWrapper<GQWorkout>;
  WorkoutExercise: ResolverTypeWrapper<GQWorkoutExercise>;
  WorkoutSet: ResolverTypeWrapper<GQWorkoutSet>;
  WorkoutSetInput: ResolverTypeWrapper<GQWorkoutSetInput>;
  WorkoutSetMeta: ResolverTypeWrapper<GQWorkoutSetMeta>;
};

/** Mapping between all available schema types and the resolvers parents */
export type GQResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  BoulderCircuit: GQBoulderCircuit;
  CaloriesUnit: GQCaloriesUnit;
  CreateTodoInput: GQCreateTodoInput;
  CreateTodoPayload: GQCreateTodoPayload;
  Date: Scalars['Date']['output'];
  Duration: GQDuration;
  Event: GQEvent;
  ExerciseInfo: GQExerciseInfo;
  ExerciseInfoInput: GQExerciseInfoInput;
  ExerciseInfoInstruction: GQExerciseInfoInstruction;
  ExerciseInfoTag: GQExerciseInfoTag;
  ExerciseSchedule: GQExerciseSchedule;
  Float: Scalars['Float']['output'];
  FloatTimeSeriesEntry: GQFloatTimeSeriesEntry;
  Food: GQFood;
  FoodEntry: GQFoodEntry;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  IntervalInput: GQIntervalInput;
  JSON: Scalars['JSON']['output'];
  JSONObject: Scalars['JSONObject']['output'];
  Location: GQLocation;
  Mutation: Record<PropertyKey, never>;
  NextSet: GQNextSet;
  NutritionalContents: GQNutritionalContents;
  Query: Record<PropertyKey, never>;
  ServingSize: GQServingSize;
  Sleep: GQSleep;
  SnoozeExerciseScheduleInput: GQSnoozeExerciseScheduleInput;
  SnoozeExerciseSchedulePayload: GQSnoozeExerciseSchedulePayload;
  String: Scalars['String']['output'];
  Todo: GQTodo;
  TodoInput: GQTodoInput;
  UnsnoozeExerciseScheduleInput: GQUnsnoozeExerciseScheduleInput;
  UnsnoozeExerciseSchedulePayload: GQUnsnoozeExerciseSchedulePayload;
  UpdateTodoInput: GQUpdateTodoInput;
  UpdateTodoPayload: GQUpdateTodoPayload;
  UpdateWorkoutDataInput: GQUpdateWorkoutDataInput;
  UpdateWorkoutInput: GQUpdateWorkoutInput;
  UpdateWorkoutPayload: GQUpdateWorkoutPayload;
  User: GQUser;
  UserDataSource: GQUserDataSource;
  Workout: GQWorkout;
  WorkoutExercise: GQWorkoutExercise;
  WorkoutSet: GQWorkoutSet;
  WorkoutSetInput: GQWorkoutSetInput;
  WorkoutSetMeta: GQWorkoutSetMeta;
};

export type GQBoulderCircuitResolvers<ContextType = any, ParentType extends GQResolversParentTypes['BoulderCircuit'] = GQResolversParentTypes['BoulderCircuit']> = {
  createdAt?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  gradeEstimate?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  gradeRange?: Resolver<Maybe<Array<Maybe<GQResolversTypes['Float']>>>, ParentType, ContextType>;
  hasZones?: Resolver<Maybe<GQResolversTypes['Boolean']>, ParentType, ContextType>;
  holdColor?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  holdColorSecondary?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<GQResolversTypes['ID'], ParentType, ContextType>;
  labelColor?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
};

export type GQCaloriesUnitResolvers<ContextType = any, ParentType extends GQResolversParentTypes['CaloriesUnit'] = GQResolversParentTypes['CaloriesUnit']> = {
  unit?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<GQResolversTypes['Float'], ParentType, ContextType>;
};

export type GQCreateTodoPayloadResolvers<ContextType = any, ParentType extends GQResolversParentTypes['CreateTodoPayload'] = GQResolversParentTypes['CreateTodoPayload']> = {
  todo?: Resolver<Maybe<GQResolversTypes['Todo']>, ParentType, ContextType>;
};

export interface GQDateScalarConfig extends GraphQLScalarTypeConfig<GQResolversTypes['Date'], any> {
  name: 'Date';
}

export type GQDurationResolvers<ContextType = any, ParentType extends GQResolversParentTypes['Duration'] = GQResolversParentTypes['Duration']> = {
  days?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  hours?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  minutes?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  months?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  seconds?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  weeks?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  years?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
};

export type GQEventResolvers<ContextType = any, ParentType extends GQResolversParentTypes['Event'] = GQResolversParentTypes['Event']> = {
  created?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
  datetype?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  due?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
  end?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<GQResolversTypes['ID'], ParentType, ContextType>;
  location?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  order?: Resolver<Maybe<GQResolversTypes['Int']>, ParentType, ContextType>;
  start?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
  summary?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
};

export type GQExerciseInfoResolvers<ContextType = any, ParentType extends GQResolversParentTypes['ExerciseInfo'] = GQResolversParentTypes['ExerciseInfo']> = {
  aliases?: Resolver<Array<GQResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<GQResolversTypes['Int'], ParentType, ContextType>;
  inputs?: Resolver<Array<GQResolversTypes['ExerciseInfoInput']>, ParentType, ContextType>;
  instructions?: Resolver<Array<GQResolversTypes['ExerciseInfoInstruction']>, ParentType, ContextType>;
  isHidden?: Resolver<GQResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<GQResolversTypes['ExerciseInfoTag']>>, ParentType, ContextType>;
};

export type GQExerciseInfoInputResolvers<ContextType = any, ParentType extends GQResolversParentTypes['ExerciseInfoInput'] = GQResolversParentTypes['ExerciseInfoInput']> = {
  type?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
};

export type GQExerciseInfoInstructionResolvers<ContextType = any, ParentType extends GQResolversParentTypes['ExerciseInfoInstruction'] = GQResolversParentTypes['ExerciseInfoInstruction']> = {
  value?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
};

export type GQExerciseInfoTagResolvers<ContextType = any, ParentType extends GQResolversParentTypes['ExerciseInfoTag'] = GQResolversParentTypes['ExerciseInfoTag']> = {
  name?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
};

export type GQExerciseScheduleResolvers<ContextType = any, ParentType extends GQResolversParentTypes['ExerciseSchedule'] = GQResolversParentTypes['ExerciseSchedule']> = {
  baseWeight?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  deloadFactor?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  enabled?: Resolver<GQResolversTypes['Boolean'], ParentType, ContextType>;
  exerciseId?: Resolver<GQResolversTypes['Int'], ParentType, ContextType>;
  exerciseInfo?: Resolver<GQResolversTypes['ExerciseInfo'], ParentType, ContextType>;
  frequency?: Resolver<GQResolversTypes['Duration'], ParentType, ContextType>;
  id?: Resolver<GQResolversTypes['ID'], ParentType, ContextType>;
  increment?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  nextSet?: Resolver<Maybe<GQResolversTypes['NextSet']>, ParentType, ContextType>;
  order?: Resolver<Maybe<GQResolversTypes['Int']>, ParentType, ContextType>;
  snoozedUntil?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
  workingReps?: Resolver<Maybe<GQResolversTypes['Int']>, ParentType, ContextType>;
  workingSets?: Resolver<Maybe<GQResolversTypes['Int']>, ParentType, ContextType>;
};

export type GQFloatTimeSeriesEntryResolvers<ContextType = any, ParentType extends GQResolversParentTypes['FloatTimeSeriesEntry'] = GQResolversParentTypes['FloatTimeSeriesEntry']> = {
  timestamp?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
  value?: Resolver<GQResolversTypes['Float'], ParentType, ContextType>;
};

export type GQFoodResolvers<ContextType = any, ParentType extends GQResolversParentTypes['Food'] = GQResolversParentTypes['Food']> = {
  description?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<GQResolversTypes['ID'], ParentType, ContextType>;
  servingSizes?: Resolver<Array<GQResolversTypes['ServingSize']>, ParentType, ContextType>;
};

export type GQFoodEntryResolvers<ContextType = any, ParentType extends GQResolversParentTypes['FoodEntry'] = GQResolversParentTypes['FoodEntry']> = {
  datetime?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
  food?: Resolver<GQResolversTypes['Food'], ParentType, ContextType>;
  id?: Resolver<GQResolversTypes['ID'], ParentType, ContextType>;
  mealName?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  nutritionalContents?: Resolver<GQResolversTypes['NutritionalContents'], ParentType, ContextType>;
  servingSize?: Resolver<GQResolversTypes['ServingSize'], ParentType, ContextType>;
  servings?: Resolver<GQResolversTypes['Float'], ParentType, ContextType>;
  type?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
};

export interface GQJsonScalarConfig extends GraphQLScalarTypeConfig<GQResolversTypes['JSON'], any> {
  name: 'JSON';
}

export interface GQJsonObjectScalarConfig extends GraphQLScalarTypeConfig<GQResolversTypes['JSONObject'], any> {
  name: 'JSONObject';
}

export type GQLocationResolvers<ContextType = any, ParentType extends GQResolversParentTypes['Location'] = GQResolversParentTypes['Location']> = {
  boulderCircuits?: Resolver<Maybe<Array<GQResolversTypes['BoulderCircuit']>>, ParentType, ContextType>;
  createdAt?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<GQResolversTypes['ID'], ParentType, ContextType>;
  isFavorite?: Resolver<Maybe<GQResolversTypes['Boolean']>, ParentType, ContextType>;
  knownAddresses?: Resolver<Maybe<Array<GQResolversTypes['String']>>, ParentType, ContextType>;
  name?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
  userId?: Resolver<GQResolversTypes['ID'], ParentType, ContextType>;
};

export type GQMutationResolvers<ContextType = any, ParentType extends GQResolversParentTypes['Mutation'] = GQResolversParentTypes['Mutation']> = {
  createTodo?: Resolver<Maybe<GQResolversTypes['CreateTodoPayload']>, ParentType, ContextType, RequireFields<GQMutationCreateTodoArgs, 'input'>>;
  deleteTodo?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType, RequireFields<GQMutationDeleteTodoArgs, 'id'>>;
  snoozeExerciseSchedule?: Resolver<Maybe<GQResolversTypes['SnoozeExerciseSchedulePayload']>, ParentType, ContextType, RequireFields<GQMutationSnoozeExerciseScheduleArgs, 'input'>>;
  unsnoozeExerciseSchedule?: Resolver<Maybe<GQResolversTypes['UnsnoozeExerciseSchedulePayload']>, ParentType, ContextType, RequireFields<GQMutationUnsnoozeExerciseScheduleArgs, 'input'>>;
  updateTodo?: Resolver<Maybe<GQResolversTypes['UpdateTodoPayload']>, ParentType, ContextType, RequireFields<GQMutationUpdateTodoArgs, 'input'>>;
  updateWorkout?: Resolver<Maybe<GQResolversTypes['UpdateWorkoutPayload']>, ParentType, ContextType, RequireFields<GQMutationUpdateWorkoutArgs, 'input'>>;
};

export type GQNextSetResolvers<ContextType = any, ParentType extends GQResolversParentTypes['NextSet'] = GQResolversParentTypes['NextSet']> = {
  dueOn?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
  exerciseId?: Resolver<GQResolversTypes['Int'], ParentType, ContextType>;
  exerciseSchedule?: Resolver<GQResolversTypes['ExerciseSchedule'], ParentType, ContextType>;
  id?: Resolver<GQResolversTypes['ID'], ParentType, ContextType>;
  nextWorkingSetInputs?: Resolver<Maybe<Array<GQResolversTypes['WorkoutSetInput']>>, ParentType, ContextType>;
  nextWorkingSets?: Resolver<Maybe<GQResolversTypes['Int']>, ParentType, ContextType>;
  successful?: Resolver<Maybe<GQResolversTypes['Boolean']>, ParentType, ContextType>;
  workedOutAt?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
};

export type GQNutritionalContentsResolvers<ContextType = any, ParentType extends GQResolversParentTypes['NutritionalContents'] = GQResolversParentTypes['NutritionalContents']> = {
  energy?: Resolver<GQResolversTypes['CaloriesUnit'], ParentType, ContextType>;
  protein?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
};

export type GQQueryResolvers<ContextType = any, ParentType extends GQResolversParentTypes['Query'] = GQResolversParentTypes['Query']> = {
  hello?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  user?: Resolver<Maybe<GQResolversTypes['User']>, ParentType, ContextType>;
};

export type GQServingSizeResolvers<ContextType = any, ParentType extends GQResolversParentTypes['ServingSize'] = GQResolversParentTypes['ServingSize']> = {
  nutritionMultiplier?: Resolver<GQResolversTypes['Float'], ParentType, ContextType>;
  unit?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<GQResolversTypes['Float'], ParentType, ContextType>;
};

export type GQSleepResolvers<ContextType = any, ParentType extends GQResolversParentTypes['Sleep'] = GQResolversParentTypes['Sleep']> = {
  deviceId?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  endedAt?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<GQResolversTypes['ID'], ParentType, ContextType>;
  startedAt?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
  totalSleepTime?: Resolver<GQResolversTypes['Float'], ParentType, ContextType>;
};

export type GQSnoozeExerciseSchedulePayloadResolvers<ContextType = any, ParentType extends GQResolversParentTypes['SnoozeExerciseSchedulePayload'] = GQResolversParentTypes['SnoozeExerciseSchedulePayload']> = {
  exerciseSchedule?: Resolver<Maybe<GQResolversTypes['ExerciseSchedule']>, ParentType, ContextType>;
};

export type GQTodoResolvers<ContextType = any, ParentType extends GQResolversParentTypes['Todo'] = GQResolversParentTypes['Todo']> = {
  completed?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
  created?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
  due?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<GQResolversTypes['ID'], ParentType, ContextType>;
  order?: Resolver<Maybe<GQResolversTypes['Int']>, ParentType, ContextType>;
  start?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
  summary?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
};

export type GQUnsnoozeExerciseSchedulePayloadResolvers<ContextType = any, ParentType extends GQResolversParentTypes['UnsnoozeExerciseSchedulePayload'] = GQResolversParentTypes['UnsnoozeExerciseSchedulePayload']> = {
  exerciseSchedule?: Resolver<Maybe<GQResolversTypes['ExerciseSchedule']>, ParentType, ContextType>;
};

export type GQUpdateTodoPayloadResolvers<ContextType = any, ParentType extends GQResolversParentTypes['UpdateTodoPayload'] = GQResolversParentTypes['UpdateTodoPayload']> = {
  todo?: Resolver<Maybe<GQResolversTypes['Todo']>, ParentType, ContextType>;
};

export type GQUpdateWorkoutPayloadResolvers<ContextType = any, ParentType extends GQResolversParentTypes['UpdateWorkoutPayload'] = GQResolversParentTypes['UpdateWorkoutPayload']> = {
  workout?: Resolver<Maybe<GQResolversTypes['Workout']>, ParentType, ContextType>;
};

export type GQUserResolvers<ContextType = any, ParentType extends GQResolversParentTypes['User'] = GQResolversParentTypes['User']> = {
  availableBalance?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  dataSources?: Resolver<Maybe<Array<GQResolversTypes['UserDataSource']>>, ParentType, ContextType>;
  email?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  emailVerified?: Resolver<Maybe<GQResolversTypes['Boolean']>, ParentType, ContextType>;
  events?: Resolver<Maybe<Array<GQResolversTypes['Event']>>, ParentType, ContextType, RequireFields<GQUserEventsArgs, 'interval'>>;
  exerciseSchedules?: Resolver<Maybe<Array<GQResolversTypes['ExerciseSchedule']>>, ParentType, ContextType>;
  fatRatio?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  fatRatioTimeSeries?: Resolver<Maybe<Array<GQResolversTypes['FloatTimeSeriesEntry']>>, ParentType, ContextType>;
  foodEntries?: Resolver<Maybe<Array<GQResolversTypes['FoodEntry']>>, ParentType, ContextType, RequireFields<GQUserFoodEntriesArgs, 'interval'>>;
  futureBusynessFraction?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  id?: Resolver<GQResolversTypes['ID'], ParentType, ContextType>;
  image?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  inboxEmailCount?: Resolver<Maybe<GQResolversTypes['Int']>, ParentType, ContextType>;
  locations?: Resolver<Maybe<Array<GQResolversTypes['Location']>>, ParentType, ContextType>;
  name?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  nextSets?: Resolver<Maybe<Array<GQResolversTypes['NextSet']>>, ParentType, ContextType>;
  pastBusynessFraction?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  sleepDebt?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  sleepDebtFraction?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  sleepDebtFractionTimeSeries?: Resolver<Maybe<Array<GQResolversTypes['FloatTimeSeriesEntry']>>, ParentType, ContextType>;
  sleeps?: Resolver<Maybe<Array<GQResolversTypes['Sleep']>>, ParentType, ContextType, RequireFields<GQUserSleepsArgs, 'interval'>>;
  timeZone?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  todos?: Resolver<Maybe<Array<GQResolversTypes['Todo']>>, ParentType, ContextType, Partial<GQUserTodosArgs>>;
  weight?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  weightTimeSeries?: Resolver<Maybe<Array<GQResolversTypes['FloatTimeSeriesEntry']>>, ParentType, ContextType>;
  workouts?: Resolver<Maybe<Array<GQResolversTypes['Workout']>>, ParentType, ContextType, RequireFields<GQUserWorkoutsArgs, 'interval'>>;
};

export type GQUserDataSourceResolvers<ContextType = any, ParentType extends GQResolversParentTypes['UserDataSource'] = GQResolversParentTypes['UserDataSource']> = {
  config?: Resolver<Maybe<GQResolversTypes['JSON']>, ParentType, ContextType>;
  createdAt?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<GQResolversTypes['ID'], ParentType, ContextType>;
  lastAttemptedAt?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
  lastError?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  lastFailedAt?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
  lastFailedRuntime?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  lastResult?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  lastSuccessfulAt?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
  lastSuccessfulRuntime?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
  lastSyncedAt?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
  name?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  paused?: Resolver<Maybe<GQResolversTypes['Boolean']>, ParentType, ContextType>;
  source?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
};

export type GQWorkoutResolvers<ContextType = any, ParentType extends GQResolversParentTypes['Workout'] = GQResolversParentTypes['Workout']> = {
  createdAt?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
  exercises?: Resolver<Array<GQResolversTypes['WorkoutExercise']>, ParentType, ContextType>;
  id?: Resolver<GQResolversTypes['ID'], ParentType, ContextType>;
  location?: Resolver<Maybe<GQResolversTypes['Location']>, ParentType, ContextType>;
  locationId?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  materializedAt?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
  source?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
  workedOutAt?: Resolver<GQResolversTypes['Date'], ParentType, ContextType>;
};

export type GQWorkoutExerciseResolvers<ContextType = any, ParentType extends GQResolversParentTypes['WorkoutExercise'] = GQResolversParentTypes['WorkoutExercise']> = {
  comment?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  exerciseId?: Resolver<GQResolversTypes['Int'], ParentType, ContextType>;
  exerciseInfo?: Resolver<GQResolversTypes['ExerciseInfo'], ParentType, ContextType>;
  sets?: Resolver<Array<GQResolversTypes['WorkoutSet']>, ParentType, ContextType>;
};

export type GQWorkoutSetResolvers<ContextType = any, ParentType extends GQResolversParentTypes['WorkoutSet'] = GQResolversParentTypes['WorkoutSet']> = {
  comment?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
  inputs?: Resolver<Array<GQResolversTypes['WorkoutSetInput']>, ParentType, ContextType>;
  meta?: Resolver<Maybe<Array<GQResolversTypes['WorkoutSetMeta']>>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<GQResolversTypes['Date']>, ParentType, ContextType>;
};

export type GQWorkoutSetInputResolvers<ContextType = any, ParentType extends GQResolversParentTypes['WorkoutSetInput'] = GQResolversParentTypes['WorkoutSetInput']> = {
  assistType?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  unit?: Resolver<Maybe<GQResolversTypes['String']>, ParentType, ContextType>;
  value?: Resolver<Maybe<GQResolversTypes['Float']>, ParentType, ContextType>;
};

export type GQWorkoutSetMetaResolvers<ContextType = any, ParentType extends GQResolversParentTypes['WorkoutSetMeta'] = GQResolversParentTypes['WorkoutSetMeta']> = {
  key?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<GQResolversTypes['String'], ParentType, ContextType>;
};

export type GQResolvers<ContextType = any> = {
  BoulderCircuit?: GQBoulderCircuitResolvers<ContextType>;
  CaloriesUnit?: GQCaloriesUnitResolvers<ContextType>;
  CreateTodoPayload?: GQCreateTodoPayloadResolvers<ContextType>;
  Date?: GraphQLScalarType;
  Duration?: GQDurationResolvers<ContextType>;
  Event?: GQEventResolvers<ContextType>;
  ExerciseInfo?: GQExerciseInfoResolvers<ContextType>;
  ExerciseInfoInput?: GQExerciseInfoInputResolvers<ContextType>;
  ExerciseInfoInstruction?: GQExerciseInfoInstructionResolvers<ContextType>;
  ExerciseInfoTag?: GQExerciseInfoTagResolvers<ContextType>;
  ExerciseSchedule?: GQExerciseScheduleResolvers<ContextType>;
  FloatTimeSeriesEntry?: GQFloatTimeSeriesEntryResolvers<ContextType>;
  Food?: GQFoodResolvers<ContextType>;
  FoodEntry?: GQFoodEntryResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  JSONObject?: GraphQLScalarType;
  Location?: GQLocationResolvers<ContextType>;
  Mutation?: GQMutationResolvers<ContextType>;
  NextSet?: GQNextSetResolvers<ContextType>;
  NutritionalContents?: GQNutritionalContentsResolvers<ContextType>;
  Query?: GQQueryResolvers<ContextType>;
  ServingSize?: GQServingSizeResolvers<ContextType>;
  Sleep?: GQSleepResolvers<ContextType>;
  SnoozeExerciseSchedulePayload?: GQSnoozeExerciseSchedulePayloadResolvers<ContextType>;
  Todo?: GQTodoResolvers<ContextType>;
  UnsnoozeExerciseSchedulePayload?: GQUnsnoozeExerciseSchedulePayloadResolvers<ContextType>;
  UpdateTodoPayload?: GQUpdateTodoPayloadResolvers<ContextType>;
  UpdateWorkoutPayload?: GQUpdateWorkoutPayloadResolvers<ContextType>;
  User?: GQUserResolvers<ContextType>;
  UserDataSource?: GQUserDataSourceResolvers<ContextType>;
  Workout?: GQWorkoutResolvers<ContextType>;
  WorkoutExercise?: GQWorkoutExerciseResolvers<ContextType>;
  WorkoutSet?: GQWorkoutSetResolvers<ContextType>;
  WorkoutSetInput?: GQWorkoutSetInputResolvers<ContextType>;
  WorkoutSetMeta?: GQWorkoutSetMetaResolvers<ContextType>;
};


export const DiaryAgendaDayTodoFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"DiaryAgendaDayTodo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Todo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}}]} as unknown as DocumentNode<GQDiaryAgendaDayTodoFragment, unknown>;
export const CalendarUserWorkoutsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CalendarUserWorkouts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"interval"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IntervalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workouts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"boulderCircuits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"holdColor"}},{"kind":"Field","name":{"kind":"Name","value":"gradeEstimate"}},{"kind":"Field","name":{"kind":"Name","value":"gradeRange"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"labelColor"}},{"kind":"Field","name":{"kind":"Name","value":"hasZones"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isHidden"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"instructions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"foodEntries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"datetime"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"food"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"servingSizes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"nutritionMultiplier"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"mealName"}},{"kind":"Field","name":{"kind":"Name","value":"servings"}},{"kind":"Field","name":{"kind":"Name","value":"servingSize"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"nutritionMultiplier"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nutritionalContents"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"energy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}}]}},{"kind":"Field","name":{"kind":"Name","value":"protein"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GQCalendarUserWorkoutsQuery, GQCalendarUserWorkoutsQueryVariables>;
export const GetLatestWeightEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLatestWeightEntry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"weight"}},{"kind":"Field","name":{"kind":"Name","value":"weightTimeSeries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pastBusynessFraction"}},{"kind":"Field","name":{"kind":"Name","value":"futureBusynessFraction"}},{"kind":"Field","name":{"kind":"Name","value":"sleepDebtFraction"}},{"kind":"Field","name":{"kind":"Name","value":"sleepDebtFractionTimeSeries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fatRatio"}},{"kind":"Field","name":{"kind":"Name","value":"fatRatioTimeSeries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"availableBalance"}},{"kind":"Field","name":{"kind":"Name","value":"inboxEmailCount"}},{"kind":"Field","name":{"kind":"Name","value":"dataSources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"paused"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastSyncedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulRuntime"}},{"kind":"Field","name":{"kind":"Name","value":"lastResult"}},{"kind":"Field","name":{"kind":"Name","value":"lastFailedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastFailedRuntime"}},{"kind":"Field","name":{"kind":"Name","value":"lastAttemptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastError"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"config"}}]}}]}}]}}]} as unknown as DocumentNode<GQGetLatestWeightEntryQuery, GQGetLatestWeightEntryQueryVariables>;
export const DiaryAgendaDayUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DiaryAgendaDayUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"image"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"dataSources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"paused"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastSyncedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulRuntime"}},{"kind":"Field","name":{"kind":"Name","value":"lastResult"}},{"kind":"Field","name":{"kind":"Name","value":"lastFailedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastFailedRuntime"}},{"kind":"Field","name":{"kind":"Name","value":"lastAttemptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastError"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"config"}}]}},{"kind":"Field","name":{"kind":"Name","value":"exerciseSchedules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}}]}}]} as unknown as DocumentNode<GQDiaryAgendaDayUserQuery, GQDiaryAgendaDayUserQueryVariables>;
export const DiaryAgendaDayUserTodosDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DiaryAgendaDayUserTodos"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"interval"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IntervalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"knownAddresses"}},{"kind":"Field","name":{"kind":"Name","value":"boulderCircuits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"holdColor"}},{"kind":"Field","name":{"kind":"Name","value":"gradeEstimate"}},{"kind":"Field","name":{"kind":"Name","value":"gradeRange"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"labelColor"}},{"kind":"Field","name":{"kind":"Name","value":"hasZones"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"sleeps"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"totalSleepTime"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextSets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"dueOn"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"successful"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSets"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSetInputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"exerciseSchedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isHidden"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"instructions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"todos"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}},{"kind":"Field","name":{"kind":"Name","value":"events"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}},{"kind":"Field","name":{"kind":"Name","value":"datetype"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workouts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"materializedAt"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isHidden"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"instructions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GQDiaryAgendaDayUserTodosQuery, GQDiaryAgendaDayUserTodosQueryVariables>;
export const CreateTodoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTodo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateTodoInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTodo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"todo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}}]}}]}}]}}]} as unknown as DocumentNode<GQCreateTodoMutation, GQCreateTodoMutationVariables>;
export const SnoozeExerciseScheduleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SnoozeExerciseSchedule"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SnoozeExerciseScheduleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"snoozeExerciseSchedule"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseSchedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"nextSet"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"dueOn"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"successful"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSets"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSetInputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"exerciseSchedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GQSnoozeExerciseScheduleMutation, GQSnoozeExerciseScheduleMutationVariables>;
export const UnsnoozeExerciseScheduleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnsnoozeExerciseSchedule"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UnsnoozeExerciseScheduleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unsnoozeExerciseSchedule"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseSchedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"nextSet"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"dueOn"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"successful"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSets"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSetInputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"exerciseSchedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GQUnsnoozeExerciseScheduleMutation, GQUnsnoozeExerciseScheduleMutationVariables>;
export const UpdateTodoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTodo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateTodoInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTodo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"todo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}}]}}]}}]} as unknown as DocumentNode<GQUpdateTodoMutation, GQUpdateTodoMutationVariables>;
export const DeleteTodoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTodo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTodo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<GQDeleteTodoMutation, GQDeleteTodoMutationVariables>;
export const DiaryAgendaFoodDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DiaryAgendaFood"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"interval"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IntervalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"foodEntries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"datetime"}},{"kind":"Field","name":{"kind":"Name","value":"mealName"}},{"kind":"Field","name":{"kind":"Name","value":"nutritionalContents"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"energy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}}]}},{"kind":"Field","name":{"kind":"Name","value":"protein"}}]}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"food"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"servingSizes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"nutritionMultiplier"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"servings"}},{"kind":"Field","name":{"kind":"Name","value":"servingSize"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"nutritionMultiplier"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GQDiaryAgendaFoodQuery, GQDiaryAgendaFoodQueryVariables>;
export const UpdateWorkoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWorkout"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateWorkoutInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWorkout"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"materializedAt"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isHidden"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"instructions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GQUpdateWorkoutMutation, GQUpdateWorkoutMutationVariables>;
export const WorkoutFormNextSetsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WorkoutFormNextSets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"nextSets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"dueOn"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"successful"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSets"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSetInputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"exerciseSchedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isHidden"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"instructions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GQWorkoutFormNextSetsQuery, GQWorkoutFormNextSetsQueryVariables>;
export const ListPageUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListPageUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"todos"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}}]}}]}}]} as unknown as DocumentNode<GQListPageUserQuery, GQListPageUserQueryVariables>;
export const SourceWidgetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SourceWidget"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"dataSources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"paused"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastSyncedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastSuccessfulRuntime"}},{"kind":"Field","name":{"kind":"Name","value":"lastResult"}},{"kind":"Field","name":{"kind":"Name","value":"lastFailedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastFailedRuntime"}},{"kind":"Field","name":{"kind":"Name","value":"lastAttemptedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastError"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"config"}}]}}]}}]}}]} as unknown as DocumentNode<GQSourceWidgetQuery, GQSourceWidgetQueryVariables>;