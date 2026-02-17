import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
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
};

export type BoulderCircuit = {
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

export type CaloriesUnit = {
  __typename: 'CaloriesUnit';
  unit: Scalars['String']['output'];
  value: Scalars['Float']['output'];
};

export type CreateTodoInput = {
  data: TodoInput;
};

export type CreateTodoPayload = {
  __typename: 'CreateTodoPayload';
  todo?: Maybe<Todo>;
};

export type Duration = {
  __typename: 'Duration';
  days?: Maybe<Scalars['Float']['output']>;
  hours?: Maybe<Scalars['Float']['output']>;
  minutes?: Maybe<Scalars['Float']['output']>;
  months?: Maybe<Scalars['Float']['output']>;
  seconds?: Maybe<Scalars['Float']['output']>;
  weeks?: Maybe<Scalars['Float']['output']>;
  years?: Maybe<Scalars['Float']['output']>;
};

export type Event = {
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

export type ExerciseInfo = {
  __typename: 'ExerciseInfo';
  aliases: Array<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  inputs: Array<ExerciseInfoInput>;
  instructions: Array<ExerciseInfoInstruction>;
  isHidden: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  tags?: Maybe<Array<ExerciseInfoTag>>;
};

export type ExerciseInfoInput = {
  __typename: 'ExerciseInfoInput';
  type: Scalars['String']['output'];
};

export type ExerciseInfoInstruction = {
  __typename: 'ExerciseInfoInstruction';
  value: Scalars['String']['output'];
};

export type ExerciseInfoTag = {
  __typename: 'ExerciseInfoTag';
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type ExerciseSchedule = {
  __typename: 'ExerciseSchedule';
  baseWeight?: Maybe<Scalars['Float']['output']>;
  deloadFactor?: Maybe<Scalars['Float']['output']>;
  enabled: Scalars['Boolean']['output'];
  exerciseId: Scalars['Int']['output'];
  exerciseInfo: ExerciseInfo;
  frequency: Duration;
  id: Scalars['ID']['output'];
  increment?: Maybe<Scalars['Float']['output']>;
  nextSet?: Maybe<NextSet>;
  order?: Maybe<Scalars['Int']['output']>;
  snoozedUntil?: Maybe<Scalars['Date']['output']>;
  workingReps?: Maybe<Scalars['Int']['output']>;
  workingSets?: Maybe<Scalars['Int']['output']>;
};

export type Food = {
  __typename: 'Food';
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  servingSizes: Array<ServingSize>;
};

export type FoodEntry = {
  __typename: 'FoodEntry';
  datetime: Scalars['Date']['output'];
  food: Food;
  id: Scalars['ID']['output'];
  mealName: Scalars['String']['output'];
  nutritionalContents: NutritionalContents;
  servingSize: ServingSize;
  servings: Scalars['Float']['output'];
  type: Scalars['String']['output'];
};

export type IntervalInput = {
  end: Scalars['Date']['input'];
  start: Scalars['Date']['input'];
};

export type Location = {
  __typename: 'Location';
  boulderCircuits?: Maybe<Array<BoulderCircuit>>;
  createdAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  isFavorite?: Maybe<Scalars['Boolean']['output']>;
  knownAddresses?: Maybe<Array<Scalars['String']['output']>>;
  name: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
  userId: Scalars['ID']['output'];
};

export type Mutation = {
  __typename: 'Mutation';
  createTodo?: Maybe<CreateTodoPayload>;
  deleteTodo?: Maybe<Scalars['String']['output']>;
  snoozeExerciseSchedule?: Maybe<SnoozeExerciseSchedulePayload>;
  unsnoozeExerciseSchedule?: Maybe<UnsnoozeExerciseSchedulePayload>;
  updateTodo?: Maybe<UpdateTodoPayload>;
};


export type MutationCreateTodoArgs = {
  input: CreateTodoInput;
};


export type MutationDeleteTodoArgs = {
  id: Scalars['String']['input'];
};


export type MutationSnoozeExerciseScheduleArgs = {
  input: SnoozeExerciseScheduleInput;
};


export type MutationUnsnoozeExerciseScheduleArgs = {
  input: UnsnoozeExerciseScheduleInput;
};


export type MutationUpdateTodoArgs = {
  input: UpdateTodoInput;
};

export type NextSet = {
  __typename: 'NextSet';
  dueOn: Scalars['Date']['output'];
  exerciseId: Scalars['Int']['output'];
  nextWorkingSetInputs?: Maybe<Array<WorkoutSetInput>>;
  nextWorkingSets?: Maybe<Scalars['Int']['output']>;
  scheduleEntry: ExerciseSchedule;
  successful?: Maybe<Scalars['Boolean']['output']>;
  workedOutAt?: Maybe<Scalars['Date']['output']>;
};

export type NutritionalContents = {
  __typename: 'NutritionalContents';
  energy: CaloriesUnit;
  protein?: Maybe<Scalars['Float']['output']>;
};

export type Query = {
  __typename: 'Query';
  hello?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type ServingSize = {
  __typename: 'ServingSize';
  nutritionMultiplier: Scalars['Float']['output'];
  unit: Scalars['String']['output'];
  value: Scalars['Float']['output'];
};

export type Sleep = {
  __typename: 'Sleep';
  deviceId: Scalars['String']['output'];
  endedAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  startedAt: Scalars['Date']['output'];
  totalSleepTime: Scalars['Float']['output'];
};

export type SnoozeExerciseScheduleInput = {
  exerciseScheduleId: Scalars['ID']['input'];
  snoozedUntil?: InputMaybe<Scalars['Date']['input']>;
};

export type SnoozeExerciseSchedulePayload = {
  __typename: 'SnoozeExerciseSchedulePayload';
  exerciseSchedule?: Maybe<ExerciseSchedule>;
};

export type Todo = {
  __typename: 'Todo';
  completed?: Maybe<Scalars['Date']['output']>;
  created?: Maybe<Scalars['Date']['output']>;
  due?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  order?: Maybe<Scalars['Int']['output']>;
  start?: Maybe<Scalars['Date']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
};

export type TodoInput = {
  completed?: InputMaybe<Scalars['Date']['input']>;
  due?: InputMaybe<Scalars['Date']['input']>;
  start?: InputMaybe<Scalars['Date']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
};

export type UnsnoozeExerciseScheduleInput = {
  exerciseScheduleId: Scalars['ID']['input'];
};

export type UnsnoozeExerciseSchedulePayload = {
  __typename: 'UnsnoozeExerciseSchedulePayload';
  exerciseSchedule?: Maybe<ExerciseSchedule>;
};

export type UpdateTodoInput = {
  data: TodoInput;
  id: Scalars['String']['input'];
};

export type UpdateTodoPayload = {
  __typename: 'UpdateTodoPayload';
  todo?: Maybe<Todo>;
};

export type User = {
  __typename: 'User';
  email: Scalars['String']['output'];
  emailVerified?: Maybe<Scalars['Boolean']['output']>;
  events?: Maybe<Array<Event>>;
  exerciseSchedules?: Maybe<Array<ExerciseSchedule>>;
  foodEntries?: Maybe<Array<FoodEntry>>;
  id: Scalars['ID']['output'];
  image: Scalars['String']['output'];
  locations?: Maybe<Array<Location>>;
  name: Scalars['String']['output'];
  sleeps?: Maybe<Array<Sleep>>;
  timeZone?: Maybe<Scalars['String']['output']>;
  todos?: Maybe<Array<Todo>>;
  weight?: Maybe<Scalars['Float']['output']>;
  workouts?: Maybe<Array<Workout>>;
};


export type UserEventsArgs = {
  interval: IntervalInput;
};


export type UserFoodEntriesArgs = {
  interval: IntervalInput;
};


export type UserSleepsArgs = {
  interval: IntervalInput;
};


export type UserTodosArgs = {
  interval?: InputMaybe<IntervalInput>;
};


export type UserWorkoutsArgs = {
  interval: IntervalInput;
};

export type Workout = {
  __typename: 'Workout';
  createdAt: Scalars['Date']['output'];
  exercises: Array<WorkoutExercise>;
  id: Scalars['ID']['output'];
  location?: Maybe<Location>;
  locationId?: Maybe<Scalars['String']['output']>;
  materializedAt?: Maybe<Scalars['Date']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['Date']['output'];
  workedOutAt: Scalars['Date']['output'];
};

export type WorkoutExercise = {
  __typename: 'WorkoutExercise';
  comment?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  exerciseId: Scalars['Int']['output'];
  exerciseInfo: ExerciseInfo;
  sets: Array<WorkoutSet>;
};

export type WorkoutSet = {
  __typename: 'WorkoutSet';
  comment?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['Date']['output']>;
  inputs: Array<WorkoutSetInput>;
  meta?: Maybe<Array<WorkoutSetMeta>>;
  updatedAt?: Maybe<Scalars['Date']['output']>;
};

export type WorkoutSetInput = {
  __typename: 'WorkoutSetInput';
  assistType?: Maybe<Scalars['String']['output']>;
  unit?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['Float']['output']>;
};

export type WorkoutSetMeta = {
  __typename: 'WorkoutSetMeta';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type CalendarUserWorkoutsQueryVariables = Exact<{
  interval: IntervalInput;
}>;


export type CalendarUserWorkoutsQuery = { user?: { __typename: 'User', id: string, workouts?: Array<{ __typename: 'Workout', id: string, createdAt: Date, updatedAt: Date, workedOutAt: Date, location?: { __typename: 'Location', id: string, createdAt: Date, updatedAt: Date, name: string, userId: string, boulderCircuits?: Array<{ __typename: 'BoulderCircuit', id: string, holdColor?: string | null, gradeEstimate?: number | null, gradeRange?: Array<number | null> | null, name: string, labelColor?: string | null, hasZones?: boolean | null, description?: string | null, createdAt: Date, updatedAt: Date }> | null } | null, exercises: Array<{ __typename: 'WorkoutExercise', exerciseId: number, displayName?: string | null, comment?: string | null, exerciseInfo: { __typename: 'ExerciseInfo', id: number, aliases: Array<string>, name: string, isHidden: boolean, inputs: Array<{ __typename: 'ExerciseInfoInput', type: string }>, instructions: Array<{ __typename: 'ExerciseInfoInstruction', value: string }>, tags?: Array<{ __typename: 'ExerciseInfoTag', name: string, type: string }> | null }, sets: Array<{ __typename: 'WorkoutSet', comment?: string | null, createdAt?: Date | null, updatedAt?: Date | null, inputs: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }>, meta?: Array<{ __typename: 'WorkoutSetMeta', key: string, value: string }> | null }> }> }> | null, foodEntries?: Array<{ __typename: 'FoodEntry', id: string, datetime: Date, type: string, mealName: string, servings: number, food: { __typename: 'Food', id: string, description: string, servingSizes: Array<{ __typename: 'ServingSize', value: number, unit: string, nutritionMultiplier: number }> }, servingSize: { __typename: 'ServingSize', value: number, unit: string, nutritionMultiplier: number }, nutritionalContents: { __typename: 'NutritionalContents', protein?: number | null, energy: { __typename: 'CaloriesUnit', value: number, unit: string } } }> | null } | null };

export type DiaryAgendaDayUserQueryVariables = Exact<{ [key: string]: never; }>;


export type DiaryAgendaDayUserQuery = { user?: { __typename: 'User', id: string, name: string, email: string, image: string, emailVerified?: boolean | null, timeZone?: string | null } | null };

export type DiaryAgendaDayUserTodosQueryVariables = Exact<{
  interval: IntervalInput;
}>;


export type DiaryAgendaDayUserTodosQuery = { user?: { __typename: 'User', id: string, locations?: Array<{ __typename: 'Location', id: string, createdAt: Date, updatedAt: Date, name: string, userId: string, knownAddresses?: Array<string> | null, boulderCircuits?: Array<{ __typename: 'BoulderCircuit', id: string, holdColor?: string | null, gradeEstimate?: number | null, gradeRange?: Array<number | null> | null, name: string, labelColor?: string | null, hasZones?: boolean | null, description?: string | null, createdAt: Date, updatedAt: Date }> | null }> | null, sleeps?: Array<{ __typename: 'Sleep', id: string, startedAt: Date, endedAt: Date, totalSleepTime: number, deviceId: string }> | null, exerciseSchedules?: Array<{ __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null }, nextSet?: { __typename: 'NextSet', workedOutAt?: Date | null, dueOn: Date, exerciseId: number, successful?: boolean | null, nextWorkingSets?: number | null, nextWorkingSetInputs?: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }> | null, scheduleEntry: { __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, exerciseInfo: { __typename: 'ExerciseInfo', id: number, aliases: Array<string>, name: string, isHidden: boolean, inputs: Array<{ __typename: 'ExerciseInfoInput', type: string }>, instructions: Array<{ __typename: 'ExerciseInfoInstruction', value: string }>, tags?: Array<{ __typename: 'ExerciseInfoTag', name: string, type: string }> | null }, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null } } } | null }> | null, todos?: Array<{ __typename: 'Todo', id: string, created?: Date | null, summary?: string | null, start?: Date | null, due?: Date | null, completed?: Date | null, order?: number | null }> | null, events?: Array<{ __typename: 'Event', id: string, created?: Date | null, summary?: string | null, start: Date, end: Date, datetype: string, location?: string | null, order?: number | null }> | null, workouts?: Array<{ __typename: 'Workout', id: string, createdAt: Date, updatedAt: Date, workedOutAt: Date, materializedAt?: Date | null, locationId?: string | null, source?: string | null, exercises: Array<{ __typename: 'WorkoutExercise', exerciseId: number, displayName?: string | null, comment?: string | null, exerciseInfo: { __typename: 'ExerciseInfo', id: number, aliases: Array<string>, name: string, isHidden: boolean, inputs: Array<{ __typename: 'ExerciseInfoInput', type: string }>, instructions: Array<{ __typename: 'ExerciseInfoInstruction', value: string }>, tags?: Array<{ __typename: 'ExerciseInfoTag', name: string, type: string }> | null }, sets: Array<{ __typename: 'WorkoutSet', comment?: string | null, createdAt?: Date | null, updatedAt?: Date | null, inputs: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }>, meta?: Array<{ __typename: 'WorkoutSetMeta', key: string, value: string }> | null }> }> }> | null } | null };

export type CreateTodoMutationVariables = Exact<{
  input: CreateTodoInput;
}>;


export type CreateTodoMutation = { createTodo?: { __typename: 'CreateTodoPayload', todo?: { __typename: 'Todo', id: string, created?: Date | null, summary?: string | null, start?: Date | null, due?: Date | null, completed?: Date | null } | null } | null };

export type SnoozeExerciseScheduleMutationVariables = Exact<{
  input: SnoozeExerciseScheduleInput;
}>;


export type SnoozeExerciseScheduleMutation = { snoozeExerciseSchedule?: { __typename: 'SnoozeExerciseSchedulePayload', exerciseSchedule?: { __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null }, nextSet?: { __typename: 'NextSet', workedOutAt?: Date | null, dueOn: Date, exerciseId: number, successful?: boolean | null, nextWorkingSets?: number | null, nextWorkingSetInputs?: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }> | null, scheduleEntry: { __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null } } } | null } | null } | null };

export type UnsnoozeExerciseScheduleMutationVariables = Exact<{
  input: UnsnoozeExerciseScheduleInput;
}>;


export type UnsnoozeExerciseScheduleMutation = { unsnoozeExerciseSchedule?: { __typename: 'UnsnoozeExerciseSchedulePayload', exerciseSchedule?: { __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null }, nextSet?: { __typename: 'NextSet', workedOutAt?: Date | null, dueOn: Date, exerciseId: number, successful?: boolean | null, nextWorkingSets?: number | null, nextWorkingSetInputs?: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }> | null, scheduleEntry: { __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null } } } | null } | null } | null };

export type DiaryAgendaDayTodoFragment = { __typename: 'Todo', id: string, start?: Date | null, due?: Date | null, completed?: Date | null, summary?: string | null };

export type UpdateTodoMutationVariables = Exact<{
  input: UpdateTodoInput;
}>;


export type UpdateTodoMutation = { updateTodo?: { __typename: 'UpdateTodoPayload', todo?: { __typename: 'Todo', id: string, created?: Date | null, start?: Date | null, due?: Date | null, completed?: Date | null, summary?: string | null } | null } | null };

export type DeleteTodoMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteTodoMutation = { deleteTodo?: string | null };

export type DiaryAgendaFoodQueryVariables = Exact<{
  interval: IntervalInput;
}>;


export type DiaryAgendaFoodQuery = { user?: { __typename: 'User', foodEntries?: Array<{ __typename: 'FoodEntry', id: string, datetime: Date, mealName: string, type: string, servings: number, nutritionalContents: { __typename: 'NutritionalContents', protein?: number | null, energy: { __typename: 'CaloriesUnit', value: number, unit: string } }, food: { __typename: 'Food', id: string, description: string, servingSizes: Array<{ __typename: 'ServingSize', unit: string, value: number, nutritionMultiplier: number }> }, servingSize: { __typename: 'ServingSize', unit: string, value: number, nutritionMultiplier: number } }> | null } | null };

export type GetLatestWeightEntryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLatestWeightEntryQuery = { user?: { __typename: 'User', weight?: number | null } | null };

export type WorkoutFormNextSetsQueryVariables = Exact<{ [key: string]: never; }>;


export type WorkoutFormNextSetsQuery = { user?: { __typename: 'User', id: string, exerciseSchedules?: Array<{ __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null }, nextSet?: { __typename: 'NextSet', workedOutAt?: Date | null, dueOn: Date, exerciseId: number, successful?: boolean | null, nextWorkingSets?: number | null, nextWorkingSetInputs?: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }> | null, scheduleEntry: { __typename: 'ExerciseSchedule', id: string, exerciseId: number, enabled: boolean, increment?: number | null, workingSets?: number | null, workingReps?: number | null, deloadFactor?: number | null, baseWeight?: number | null, snoozedUntil?: Date | null, order?: number | null, exerciseInfo: { __typename: 'ExerciseInfo', id: number, aliases: Array<string>, name: string, isHidden: boolean, inputs: Array<{ __typename: 'ExerciseInfoInput', type: string }>, instructions: Array<{ __typename: 'ExerciseInfoInstruction', value: string }>, tags?: Array<{ __typename: 'ExerciseInfoTag', name: string, type: string }> | null }, frequency: { __typename: 'Duration', years?: number | null, months?: number | null, weeks?: number | null, days?: number | null, hours?: number | null, minutes?: number | null, seconds?: number | null } } } | null }> | null } | null };

export type ListPageUserQueryVariables = Exact<{ [key: string]: never; }>;


export type ListPageUserQuery = { user?: { __typename: 'User', id: string, todos?: Array<{ __typename: 'Todo', id: string, created?: Date | null, start?: Date | null, due?: Date | null, completed?: Date | null, summary?: string | null }> | null } | null };



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
export type ResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BoulderCircuit: ResolverTypeWrapper<BoulderCircuit>;
  CaloriesUnit: ResolverTypeWrapper<CaloriesUnit>;
  CreateTodoInput: CreateTodoInput;
  CreateTodoPayload: ResolverTypeWrapper<CreateTodoPayload>;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  Duration: ResolverTypeWrapper<Duration>;
  Event: ResolverTypeWrapper<Event>;
  ExerciseInfo: ResolverTypeWrapper<ExerciseInfo>;
  ExerciseInfoInput: ResolverTypeWrapper<ExerciseInfoInput>;
  ExerciseInfoInstruction: ResolverTypeWrapper<ExerciseInfoInstruction>;
  ExerciseInfoTag: ResolverTypeWrapper<ExerciseInfoTag>;
  ExerciseSchedule: ResolverTypeWrapper<ExerciseSchedule>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Food: ResolverTypeWrapper<Food>;
  FoodEntry: ResolverTypeWrapper<FoodEntry>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  IntervalInput: IntervalInput;
  Location: ResolverTypeWrapper<Location>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  NextSet: ResolverTypeWrapper<NextSet>;
  NutritionalContents: ResolverTypeWrapper<NutritionalContents>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  ServingSize: ResolverTypeWrapper<ServingSize>;
  Sleep: ResolverTypeWrapper<Sleep>;
  SnoozeExerciseScheduleInput: SnoozeExerciseScheduleInput;
  SnoozeExerciseSchedulePayload: ResolverTypeWrapper<SnoozeExerciseSchedulePayload>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Todo: ResolverTypeWrapper<Todo>;
  TodoInput: TodoInput;
  UnsnoozeExerciseScheduleInput: UnsnoozeExerciseScheduleInput;
  UnsnoozeExerciseSchedulePayload: ResolverTypeWrapper<UnsnoozeExerciseSchedulePayload>;
  UpdateTodoInput: UpdateTodoInput;
  UpdateTodoPayload: ResolverTypeWrapper<UpdateTodoPayload>;
  User: ResolverTypeWrapper<User>;
  Workout: ResolverTypeWrapper<Workout>;
  WorkoutExercise: ResolverTypeWrapper<WorkoutExercise>;
  WorkoutSet: ResolverTypeWrapper<WorkoutSet>;
  WorkoutSetInput: ResolverTypeWrapper<WorkoutSetInput>;
  WorkoutSetMeta: ResolverTypeWrapper<WorkoutSetMeta>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  BoulderCircuit: BoulderCircuit;
  CaloriesUnit: CaloriesUnit;
  CreateTodoInput: CreateTodoInput;
  CreateTodoPayload: CreateTodoPayload;
  Date: Scalars['Date']['output'];
  Duration: Duration;
  Event: Event;
  ExerciseInfo: ExerciseInfo;
  ExerciseInfoInput: ExerciseInfoInput;
  ExerciseInfoInstruction: ExerciseInfoInstruction;
  ExerciseInfoTag: ExerciseInfoTag;
  ExerciseSchedule: ExerciseSchedule;
  Float: Scalars['Float']['output'];
  Food: Food;
  FoodEntry: FoodEntry;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  IntervalInput: IntervalInput;
  Location: Location;
  Mutation: Record<PropertyKey, never>;
  NextSet: NextSet;
  NutritionalContents: NutritionalContents;
  Query: Record<PropertyKey, never>;
  ServingSize: ServingSize;
  Sleep: Sleep;
  SnoozeExerciseScheduleInput: SnoozeExerciseScheduleInput;
  SnoozeExerciseSchedulePayload: SnoozeExerciseSchedulePayload;
  String: Scalars['String']['output'];
  Todo: Todo;
  TodoInput: TodoInput;
  UnsnoozeExerciseScheduleInput: UnsnoozeExerciseScheduleInput;
  UnsnoozeExerciseSchedulePayload: UnsnoozeExerciseSchedulePayload;
  UpdateTodoInput: UpdateTodoInput;
  UpdateTodoPayload: UpdateTodoPayload;
  User: User;
  Workout: Workout;
  WorkoutExercise: WorkoutExercise;
  WorkoutSet: WorkoutSet;
  WorkoutSetInput: WorkoutSetInput;
  WorkoutSetMeta: WorkoutSetMeta;
};

export type BoulderCircuitResolvers<ContextType = any, ParentType extends ResolversParentTypes['BoulderCircuit'] = ResolversParentTypes['BoulderCircuit']> = {
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  gradeEstimate?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  gradeRange?: Resolver<Maybe<Array<Maybe<ResolversTypes['Float']>>>, ParentType, ContextType>;
  hasZones?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  holdColor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  holdColorSecondary?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  labelColor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
};

export type CaloriesUnitResolvers<ContextType = any, ParentType extends ResolversParentTypes['CaloriesUnit'] = ResolversParentTypes['CaloriesUnit']> = {
  unit?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type CreateTodoPayloadResolvers<ContextType = any, ParentType extends ResolversParentTypes['CreateTodoPayload'] = ResolversParentTypes['CreateTodoPayload']> = {
  todo?: Resolver<Maybe<ResolversTypes['Todo']>, ParentType, ContextType>;
};

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export type DurationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Duration'] = ResolversParentTypes['Duration']> = {
  days?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  hours?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  minutes?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  months?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  seconds?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  weeks?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  years?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
};

export type EventResolvers<ContextType = any, ParentType extends ResolversParentTypes['Event'] = ResolversParentTypes['Event']> = {
  created?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  datetype?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  due?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  end?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  start?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  summary?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ExerciseInfoResolvers<ContextType = any, ParentType extends ResolversParentTypes['ExerciseInfo'] = ResolversParentTypes['ExerciseInfo']> = {
  aliases?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  inputs?: Resolver<Array<ResolversTypes['ExerciseInfoInput']>, ParentType, ContextType>;
  instructions?: Resolver<Array<ResolversTypes['ExerciseInfoInstruction']>, ParentType, ContextType>;
  isHidden?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['ExerciseInfoTag']>>, ParentType, ContextType>;
};

export type ExerciseInfoInputResolvers<ContextType = any, ParentType extends ResolversParentTypes['ExerciseInfoInput'] = ResolversParentTypes['ExerciseInfoInput']> = {
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ExerciseInfoInstructionResolvers<ContextType = any, ParentType extends ResolversParentTypes['ExerciseInfoInstruction'] = ResolversParentTypes['ExerciseInfoInstruction']> = {
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ExerciseInfoTagResolvers<ContextType = any, ParentType extends ResolversParentTypes['ExerciseInfoTag'] = ResolversParentTypes['ExerciseInfoTag']> = {
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ExerciseScheduleResolvers<ContextType = any, ParentType extends ResolversParentTypes['ExerciseSchedule'] = ResolversParentTypes['ExerciseSchedule']> = {
  baseWeight?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  deloadFactor?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  exerciseId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  exerciseInfo?: Resolver<ResolversTypes['ExerciseInfo'], ParentType, ContextType>;
  frequency?: Resolver<ResolversTypes['Duration'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  increment?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  nextSet?: Resolver<Maybe<ResolversTypes['NextSet']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  snoozedUntil?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  workingReps?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  workingSets?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type FoodResolvers<ContextType = any, ParentType extends ResolversParentTypes['Food'] = ResolversParentTypes['Food']> = {
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  servingSizes?: Resolver<Array<ResolversTypes['ServingSize']>, ParentType, ContextType>;
};

export type FoodEntryResolvers<ContextType = any, ParentType extends ResolversParentTypes['FoodEntry'] = ResolversParentTypes['FoodEntry']> = {
  datetime?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  food?: Resolver<ResolversTypes['Food'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mealName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nutritionalContents?: Resolver<ResolversTypes['NutritionalContents'], ParentType, ContextType>;
  servingSize?: Resolver<ResolversTypes['ServingSize'], ParentType, ContextType>;
  servings?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type LocationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Location'] = ResolversParentTypes['Location']> = {
  boulderCircuits?: Resolver<Maybe<Array<ResolversTypes['BoulderCircuit']>>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isFavorite?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  knownAddresses?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createTodo?: Resolver<Maybe<ResolversTypes['CreateTodoPayload']>, ParentType, ContextType, RequireFields<MutationCreateTodoArgs, 'input'>>;
  deleteTodo?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType, RequireFields<MutationDeleteTodoArgs, 'id'>>;
  snoozeExerciseSchedule?: Resolver<Maybe<ResolversTypes['SnoozeExerciseSchedulePayload']>, ParentType, ContextType, RequireFields<MutationSnoozeExerciseScheduleArgs, 'input'>>;
  unsnoozeExerciseSchedule?: Resolver<Maybe<ResolversTypes['UnsnoozeExerciseSchedulePayload']>, ParentType, ContextType, RequireFields<MutationUnsnoozeExerciseScheduleArgs, 'input'>>;
  updateTodo?: Resolver<Maybe<ResolversTypes['UpdateTodoPayload']>, ParentType, ContextType, RequireFields<MutationUpdateTodoArgs, 'input'>>;
};

export type NextSetResolvers<ContextType = any, ParentType extends ResolversParentTypes['NextSet'] = ResolversParentTypes['NextSet']> = {
  dueOn?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  exerciseId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nextWorkingSetInputs?: Resolver<Maybe<Array<ResolversTypes['WorkoutSetInput']>>, ParentType, ContextType>;
  nextWorkingSets?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  scheduleEntry?: Resolver<ResolversTypes['ExerciseSchedule'], ParentType, ContextType>;
  successful?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  workedOutAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
};

export type NutritionalContentsResolvers<ContextType = any, ParentType extends ResolversParentTypes['NutritionalContents'] = ResolversParentTypes['NutritionalContents']> = {
  energy?: Resolver<ResolversTypes['CaloriesUnit'], ParentType, ContextType>;
  protein?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  hello?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
};

export type ServingSizeResolvers<ContextType = any, ParentType extends ResolversParentTypes['ServingSize'] = ResolversParentTypes['ServingSize']> = {
  nutritionMultiplier?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  unit?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SleepResolvers<ContextType = any, ParentType extends ResolversParentTypes['Sleep'] = ResolversParentTypes['Sleep']> = {
  deviceId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  endedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  startedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  totalSleepTime?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SnoozeExerciseSchedulePayloadResolvers<ContextType = any, ParentType extends ResolversParentTypes['SnoozeExerciseSchedulePayload'] = ResolversParentTypes['SnoozeExerciseSchedulePayload']> = {
  exerciseSchedule?: Resolver<Maybe<ResolversTypes['ExerciseSchedule']>, ParentType, ContextType>;
};

export type TodoResolvers<ContextType = any, ParentType extends ResolversParentTypes['Todo'] = ResolversParentTypes['Todo']> = {
  completed?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  created?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  due?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  order?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  start?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  summary?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type UnsnoozeExerciseSchedulePayloadResolvers<ContextType = any, ParentType extends ResolversParentTypes['UnsnoozeExerciseSchedulePayload'] = ResolversParentTypes['UnsnoozeExerciseSchedulePayload']> = {
  exerciseSchedule?: Resolver<Maybe<ResolversTypes['ExerciseSchedule']>, ParentType, ContextType>;
};

export type UpdateTodoPayloadResolvers<ContextType = any, ParentType extends ResolversParentTypes['UpdateTodoPayload'] = ResolversParentTypes['UpdateTodoPayload']> = {
  todo?: Resolver<Maybe<ResolversTypes['Todo']>, ParentType, ContextType>;
};

export type UserResolvers<ContextType = any, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  emailVerified?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  events?: Resolver<Maybe<Array<ResolversTypes['Event']>>, ParentType, ContextType, RequireFields<UserEventsArgs, 'interval'>>;
  exerciseSchedules?: Resolver<Maybe<Array<ResolversTypes['ExerciseSchedule']>>, ParentType, ContextType>;
  foodEntries?: Resolver<Maybe<Array<ResolversTypes['FoodEntry']>>, ParentType, ContextType, RequireFields<UserFoodEntriesArgs, 'interval'>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  image?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  locations?: Resolver<Maybe<Array<ResolversTypes['Location']>>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sleeps?: Resolver<Maybe<Array<ResolversTypes['Sleep']>>, ParentType, ContextType, RequireFields<UserSleepsArgs, 'interval'>>;
  timeZone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  todos?: Resolver<Maybe<Array<ResolversTypes['Todo']>>, ParentType, ContextType, Partial<UserTodosArgs>>;
  weight?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  workouts?: Resolver<Maybe<Array<ResolversTypes['Workout']>>, ParentType, ContextType, RequireFields<UserWorkoutsArgs, 'interval'>>;
};

export type WorkoutResolvers<ContextType = any, ParentType extends ResolversParentTypes['Workout'] = ResolversParentTypes['Workout']> = {
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  exercises?: Resolver<Array<ResolversTypes['WorkoutExercise']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['Location']>, ParentType, ContextType>;
  locationId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  materializedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  source?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  workedOutAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
};

export type WorkoutExerciseResolvers<ContextType = any, ParentType extends ResolversParentTypes['WorkoutExercise'] = ResolversParentTypes['WorkoutExercise']> = {
  comment?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  exerciseId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  exerciseInfo?: Resolver<ResolversTypes['ExerciseInfo'], ParentType, ContextType>;
  sets?: Resolver<Array<ResolversTypes['WorkoutSet']>, ParentType, ContextType>;
};

export type WorkoutSetResolvers<ContextType = any, ParentType extends ResolversParentTypes['WorkoutSet'] = ResolversParentTypes['WorkoutSet']> = {
  comment?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  inputs?: Resolver<Array<ResolversTypes['WorkoutSetInput']>, ParentType, ContextType>;
  meta?: Resolver<Maybe<Array<ResolversTypes['WorkoutSetMeta']>>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
};

export type WorkoutSetInputResolvers<ContextType = any, ParentType extends ResolversParentTypes['WorkoutSetInput'] = ResolversParentTypes['WorkoutSetInput']> = {
  assistType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  unit?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  value?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
};

export type WorkoutSetMetaResolvers<ContextType = any, ParentType extends ResolversParentTypes['WorkoutSetMeta'] = ResolversParentTypes['WorkoutSetMeta']> = {
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  BoulderCircuit?: BoulderCircuitResolvers<ContextType>;
  CaloriesUnit?: CaloriesUnitResolvers<ContextType>;
  CreateTodoPayload?: CreateTodoPayloadResolvers<ContextType>;
  Date?: GraphQLScalarType;
  Duration?: DurationResolvers<ContextType>;
  Event?: EventResolvers<ContextType>;
  ExerciseInfo?: ExerciseInfoResolvers<ContextType>;
  ExerciseInfoInput?: ExerciseInfoInputResolvers<ContextType>;
  ExerciseInfoInstruction?: ExerciseInfoInstructionResolvers<ContextType>;
  ExerciseInfoTag?: ExerciseInfoTagResolvers<ContextType>;
  ExerciseSchedule?: ExerciseScheduleResolvers<ContextType>;
  Food?: FoodResolvers<ContextType>;
  FoodEntry?: FoodEntryResolvers<ContextType>;
  Location?: LocationResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  NextSet?: NextSetResolvers<ContextType>;
  NutritionalContents?: NutritionalContentsResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ServingSize?: ServingSizeResolvers<ContextType>;
  Sleep?: SleepResolvers<ContextType>;
  SnoozeExerciseSchedulePayload?: SnoozeExerciseSchedulePayloadResolvers<ContextType>;
  Todo?: TodoResolvers<ContextType>;
  UnsnoozeExerciseSchedulePayload?: UnsnoozeExerciseSchedulePayloadResolvers<ContextType>;
  UpdateTodoPayload?: UpdateTodoPayloadResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  Workout?: WorkoutResolvers<ContextType>;
  WorkoutExercise?: WorkoutExerciseResolvers<ContextType>;
  WorkoutSet?: WorkoutSetResolvers<ContextType>;
  WorkoutSetInput?: WorkoutSetInputResolvers<ContextType>;
  WorkoutSetMeta?: WorkoutSetMetaResolvers<ContextType>;
};


export const DiaryAgendaDayTodoFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"DiaryAgendaDayTodo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Todo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}}]} as unknown as DocumentNode<DiaryAgendaDayTodoFragment, unknown>;
export const CalendarUserWorkoutsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CalendarUserWorkouts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"interval"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IntervalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"workouts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"boulderCircuits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"holdColor"}},{"kind":"Field","name":{"kind":"Name","value":"gradeEstimate"}},{"kind":"Field","name":{"kind":"Name","value":"gradeRange"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"labelColor"}},{"kind":"Field","name":{"kind":"Name","value":"hasZones"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isHidden"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"instructions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"foodEntries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"datetime"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"food"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"servingSizes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"nutritionMultiplier"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"mealName"}},{"kind":"Field","name":{"kind":"Name","value":"servings"}},{"kind":"Field","name":{"kind":"Name","value":"servingSize"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"nutritionMultiplier"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nutritionalContents"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"energy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}}]}},{"kind":"Field","name":{"kind":"Name","value":"protein"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CalendarUserWorkoutsQuery, CalendarUserWorkoutsQueryVariables>;
export const DiaryAgendaDayUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DiaryAgendaDayUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"image"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}}]}}]}}]} as unknown as DocumentNode<DiaryAgendaDayUserQuery, DiaryAgendaDayUserQueryVariables>;
export const DiaryAgendaDayUserTodosDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DiaryAgendaDayUserTodos"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"interval"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IntervalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"locations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"knownAddresses"}},{"kind":"Field","name":{"kind":"Name","value":"boulderCircuits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"holdColor"}},{"kind":"Field","name":{"kind":"Name","value":"gradeEstimate"}},{"kind":"Field","name":{"kind":"Name","value":"gradeRange"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"labelColor"}},{"kind":"Field","name":{"kind":"Name","value":"hasZones"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"sleeps"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"endedAt"}},{"kind":"Field","name":{"kind":"Name","value":"totalSleepTime"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"exerciseSchedules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"nextSet"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"dueOn"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"successful"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSets"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSetInputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"scheduleEntry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isHidden"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"instructions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"todos"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}},{"kind":"Field","name":{"kind":"Name","value":"events"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}},{"kind":"Field","name":{"kind":"Name","value":"datetype"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workouts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"materializedAt"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isHidden"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"instructions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<DiaryAgendaDayUserTodosQuery, DiaryAgendaDayUserTodosQueryVariables>;
export const CreateTodoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTodo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateTodoInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTodo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"todo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}}]}}]}}]}}]} as unknown as DocumentNode<CreateTodoMutation, CreateTodoMutationVariables>;
export const SnoozeExerciseScheduleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SnoozeExerciseSchedule"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SnoozeExerciseScheduleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"snoozeExerciseSchedule"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseSchedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"nextSet"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"dueOn"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"successful"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSets"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSetInputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"scheduleEntry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<SnoozeExerciseScheduleMutation, SnoozeExerciseScheduleMutationVariables>;
export const UnsnoozeExerciseScheduleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnsnoozeExerciseSchedule"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UnsnoozeExerciseScheduleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unsnoozeExerciseSchedule"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseSchedule"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"nextSet"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"dueOn"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"successful"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSets"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSetInputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"scheduleEntry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<UnsnoozeExerciseScheduleMutation, UnsnoozeExerciseScheduleMutationVariables>;
export const UpdateTodoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTodo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateTodoInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTodo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"todo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateTodoMutation, UpdateTodoMutationVariables>;
export const DeleteTodoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTodo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTodo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteTodoMutation, DeleteTodoMutationVariables>;
export const DiaryAgendaFoodDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DiaryAgendaFood"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"interval"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IntervalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"foodEntries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"datetime"}},{"kind":"Field","name":{"kind":"Name","value":"mealName"}},{"kind":"Field","name":{"kind":"Name","value":"nutritionalContents"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"energy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}}]}},{"kind":"Field","name":{"kind":"Name","value":"protein"}}]}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"food"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"servingSizes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"nutritionMultiplier"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"servings"}},{"kind":"Field","name":{"kind":"Name","value":"servingSize"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"nutritionMultiplier"}}]}}]}}]}}]}}]} as unknown as DocumentNode<DiaryAgendaFoodQuery, DiaryAgendaFoodQueryVariables>;
export const GetLatestWeightEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLatestWeightEntry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"weight"}}]}}]}}]} as unknown as DocumentNode<GetLatestWeightEntryQuery, GetLatestWeightEntryQueryVariables>;
export const WorkoutFormNextSetsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WorkoutFormNextSets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseSchedules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"nextSet"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"dueOn"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"successful"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSets"}},{"kind":"Field","name":{"kind":"Name","value":"nextWorkingSetInputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"scheduleEntry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"exerciseInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"aliases"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isHidden"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"instructions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"weeks"}},{"kind":"Field","name":{"kind":"Name","value":"days"}},{"kind":"Field","name":{"kind":"Name","value":"hours"}},{"kind":"Field","name":{"kind":"Name","value":"minutes"}},{"kind":"Field","name":{"kind":"Name","value":"seconds"}}]}},{"kind":"Field","name":{"kind":"Name","value":"increment"}},{"kind":"Field","name":{"kind":"Name","value":"workingSets"}},{"kind":"Field","name":{"kind":"Name","value":"workingReps"}},{"kind":"Field","name":{"kind":"Name","value":"deloadFactor"}},{"kind":"Field","name":{"kind":"Name","value":"baseWeight"}},{"kind":"Field","name":{"kind":"Name","value":"snoozedUntil"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<WorkoutFormNextSetsQuery, WorkoutFormNextSetsQueryVariables>;
export const ListPageUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListPageUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"todos"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}}]}}]}}]} as unknown as DocumentNode<ListPageUserQuery, ListPageUserQueryVariables>;