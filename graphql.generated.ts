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
  gradeRange?: Maybe<Array<Scalars['Float']['output']>>;
  hasZones?: Maybe<Scalars['Boolean']['output']>;
  holdColor?: Maybe<Scalars['String']['output']>;
  holdColorSecondary?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  labelColor?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type CreateTodoInput = {
  data: TodoInput;
};

export type CreateTodoPayload = {
  __typename: 'CreateTodoPayload';
  todo?: Maybe<Todo>;
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
  name: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
  userId: Scalars['ID']['output'];
};

export type Mutation = {
  __typename: 'Mutation';
  createTodo?: Maybe<CreateTodoPayload>;
  deleteTodo?: Maybe<Scalars['String']['output']>;
  updateTodo?: Maybe<UpdateTodoPayload>;
};


export type MutationCreateTodoArgs = {
  input: CreateTodoInput;
};


export type MutationDeleteTodoArgs = {
  id: Scalars['String']['input'];
};


export type MutationUpdateTodoArgs = {
  input: UpdateTodoInput;
};

export type Query = {
  __typename: 'Query';
  hello?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
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
  emailVerified: Scalars['Boolean']['output'];
  events?: Maybe<Array<Event>>;
  id: Scalars['ID']['output'];
  image: Scalars['String']['output'];
  name: Scalars['String']['output'];
  timeZone?: Maybe<Scalars['String']['output']>;
  todos?: Maybe<Array<Todo>>;
  workouts?: Maybe<Array<Workout>>;
};


export type UserEventsArgs = {
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

export type DiaryAgendaDayUserTodosQueryVariables = Exact<{
  interval: IntervalInput;
}>;


export type DiaryAgendaDayUserTodosQuery = { user?: { __typename: 'User', id: string, todos?: Array<{ __typename: 'Todo', id: string, created?: Date | null, summary?: string | null, start?: Date | null, due?: Date | null, completed?: Date | null, order?: number | null }> | null, events?: Array<{ __typename: 'Event', id: string, created?: Date | null, summary?: string | null, start: Date, end: Date, datetype: string, location?: string | null, order?: number | null }> | null, workouts?: Array<{ __typename: 'Workout', id: string, createdAt: Date, updatedAt: Date, workedOutAt: Date, materializedAt?: Date | null, locationId?: string | null, source?: string | null, location?: { __typename: 'Location', id: string, createdAt: Date, updatedAt: Date, name: string, userId: string, boulderCircuits?: Array<{ __typename: 'BoulderCircuit', id: string, holdColor?: string | null, gradeEstimate?: number | null, gradeRange?: Array<number> | null, name: string, labelColor?: string | null, hasZones?: boolean | null, description?: string | null, createdAt: Date, updatedAt: Date }> | null } | null, exercises: Array<{ __typename: 'WorkoutExercise', exerciseId: number, displayName?: string | null, comment?: string | null, sets: Array<{ __typename: 'WorkoutSet', comment?: string | null, createdAt?: Date | null, updatedAt?: Date | null, inputs: Array<{ __typename: 'WorkoutSetInput', unit?: string | null, value?: number | null, assistType?: string | null }>, meta?: Array<{ __typename: 'WorkoutSetMeta', key: string, value: string }> | null }> }> }> | null } | null };

export type CreateTodoMutationVariables = Exact<{
  input: CreateTodoInput;
}>;


export type CreateTodoMutation = { createTodo?: { __typename: 'CreateTodoPayload', todo?: { __typename: 'Todo', id: string, created?: Date | null, summary?: string | null, start?: Date | null, due?: Date | null, completed?: Date | null } | null } | null };

export type DiaryAgendaDayTodoFragment = { __typename: 'Todo', id: string, start?: Date | null, due?: Date | null, completed?: Date | null, summary?: string | null };

export type UpdateTodoMutationVariables = Exact<{
  input: UpdateTodoInput;
}>;


export type UpdateTodoMutation = { updateTodo?: { __typename: 'UpdateTodoPayload', todo?: { __typename: 'Todo', id: string, created?: Date | null, start?: Date | null, due?: Date | null, completed?: Date | null, summary?: string | null } | null } | null };

export type DeleteTodoMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteTodoMutation = { deleteTodo?: string | null };

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
  CreateTodoInput: CreateTodoInput;
  CreateTodoPayload: ResolverTypeWrapper<CreateTodoPayload>;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  Event: ResolverTypeWrapper<Event>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  IntervalInput: IntervalInput;
  Location: ResolverTypeWrapper<Location>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Todo: ResolverTypeWrapper<Todo>;
  TodoInput: TodoInput;
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
  CreateTodoInput: CreateTodoInput;
  CreateTodoPayload: CreateTodoPayload;
  Date: Scalars['Date']['output'];
  Event: Event;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  IntervalInput: IntervalInput;
  Location: Location;
  Mutation: Record<PropertyKey, never>;
  Query: Record<PropertyKey, never>;
  String: Scalars['String']['output'];
  Todo: Todo;
  TodoInput: TodoInput;
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
  gradeRange?: Resolver<Maybe<Array<ResolversTypes['Float']>>, ParentType, ContextType>;
  hasZones?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  holdColor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  holdColorSecondary?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  labelColor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
};

export type CreateTodoPayloadResolvers<ContextType = any, ParentType extends ResolversParentTypes['CreateTodoPayload'] = ResolversParentTypes['CreateTodoPayload']> = {
  todo?: Resolver<Maybe<ResolversTypes['Todo']>, ParentType, ContextType>;
};

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

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

export type LocationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Location'] = ResolversParentTypes['Location']> = {
  boulderCircuits?: Resolver<Maybe<Array<ResolversTypes['BoulderCircuit']>>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isFavorite?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createTodo?: Resolver<Maybe<ResolversTypes['CreateTodoPayload']>, ParentType, ContextType, RequireFields<MutationCreateTodoArgs, 'input'>>;
  deleteTodo?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType, RequireFields<MutationDeleteTodoArgs, 'id'>>;
  updateTodo?: Resolver<Maybe<ResolversTypes['UpdateTodoPayload']>, ParentType, ContextType, RequireFields<MutationUpdateTodoArgs, 'input'>>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  hello?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
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

export type UpdateTodoPayloadResolvers<ContextType = any, ParentType extends ResolversParentTypes['UpdateTodoPayload'] = ResolversParentTypes['UpdateTodoPayload']> = {
  todo?: Resolver<Maybe<ResolversTypes['Todo']>, ParentType, ContextType>;
};

export type UserResolvers<ContextType = any, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  emailVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  events?: Resolver<Maybe<Array<ResolversTypes['Event']>>, ParentType, ContextType, RequireFields<UserEventsArgs, 'interval'>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  image?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timeZone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  todos?: Resolver<Maybe<Array<ResolversTypes['Todo']>>, ParentType, ContextType, Partial<UserTodosArgs>>;
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
  CreateTodoPayload?: CreateTodoPayloadResolvers<ContextType>;
  Date?: GraphQLScalarType;
  Event?: EventResolvers<ContextType>;
  Location?: LocationResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Todo?: TodoResolvers<ContextType>;
  UpdateTodoPayload?: UpdateTodoPayloadResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  Workout?: WorkoutResolvers<ContextType>;
  WorkoutExercise?: WorkoutExerciseResolvers<ContextType>;
  WorkoutSet?: WorkoutSetResolvers<ContextType>;
  WorkoutSetInput?: WorkoutSetInputResolvers<ContextType>;
  WorkoutSetMeta?: WorkoutSetMetaResolvers<ContextType>;
};


export const DiaryAgendaDayTodoFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"DiaryAgendaDayTodo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Todo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}}]} as unknown as DocumentNode<DiaryAgendaDayTodoFragment, unknown>;
export const DiaryAgendaDayUserTodosDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DiaryAgendaDayUserTodos"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"interval"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IntervalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"todos"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}},{"kind":"Field","name":{"kind":"Name","value":"events"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"end"}},{"kind":"Field","name":{"kind":"Name","value":"datetype"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}},{"kind":"Field","name":{"kind":"Name","value":"workouts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"workedOutAt"}},{"kind":"Field","name":{"kind":"Name","value":"materializedAt"}},{"kind":"Field","name":{"kind":"Name","value":"locationId"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"boulderCircuits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"holdColor"}},{"kind":"Field","name":{"kind":"Name","value":"gradeEstimate"}},{"kind":"Field","name":{"kind":"Name","value":"gradeRange"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"labelColor"}},{"kind":"Field","name":{"kind":"Name","value":"hasZones"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"exercises"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exerciseId"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"sets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"comment"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"inputs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"assistType"}}]}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<DiaryAgendaDayUserTodosQuery, DiaryAgendaDayUserTodosQueryVariables>;
export const CreateTodoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTodo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateTodoInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTodo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"todo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}}]}}]}}]}}]} as unknown as DocumentNode<CreateTodoMutation, CreateTodoMutationVariables>;
export const UpdateTodoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTodo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateTodoInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTodo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"todo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateTodoMutation, UpdateTodoMutationVariables>;
export const DeleteTodoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTodo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTodo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteTodoMutation, DeleteTodoMutationVariables>;
export const ListPageUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListPageUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"todos"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"due"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}}]}}]}}]} as unknown as DocumentNode<ListPageUserQuery, ListPageUserQueryVariables>;