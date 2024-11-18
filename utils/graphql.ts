import { TZDate } from "@date-fns/tz";
import {
  type DefinitionNode,
  type DirectiveNode,
  type DocumentNode,
  type FieldNode,
  type FragmentDefinitionNode,
  type GraphQLErrorExtensions,
  type GraphQLFormattedError,
  Kind,
  type OperationDefinitionNode,
  print,
  type SelectionNode,
  type SelectionSetNode,
  type ValueNode,
} from "graphql";
import type { WithId } from "mongodb";
import type {
  TopLoggerClimbUser,
  TopLoggerClimbUserDereferenced,
} from "../app/api/toplogger_gql_scrape/route";
import { exercises, Unit } from "../models/exercises";
import { type WorkoutData, WorkoutSource } from "../models/workout";
import { isNonEmptyArray, isNonNullObject } from "../utils";
import { proxyCollection } from "../utils.server";

interface ApolloErrorOptions {
  graphQLErrors?: ReadonlyArray<GraphQLFormattedError>;
  errorMessage?: string;
}

// Sets the error message on this error according to the
// the GraphQL and network errors that are present.
// If the error message has already been set through the
// constructor or otherwise, this function is a nop.
const generateErrorMessage = (err: ApolloError) => {
  const errors = [...err.graphQLErrors];

  return (
    errors
      // The rest of the code sometimes unsafely types non-Error objects as GraphQLErrors
      .map(
        (err) =>
          (isNonNullObject(err) && err.message) || "Error message not found.",
      )
      .join("\n")
  );
};

class ApolloError extends Error {
  public name: string;
  public message: string;
  public graphQLErrors: ReadonlyArray<GraphQLFormattedError>;
  /**
   * Indicates the specific original cause of the error.
   *
   * This field contains the first available `graphQLError`, or `null` if none are available.
   */
  public cause:
    | ({
        readonly message: string;
        extensions?:
          | GraphQLErrorExtensions[]
          | GraphQLFormattedError["extensions"];
      } & Omit<Partial<Error> & Partial<GraphQLFormattedError>, "extensions">)
    | null;

  // Constructs an instance of ApolloError given serialized GraphQL errors.
  // Note that one of these has to be a valid
  // value or the constructed error will be meaningless.
  constructor({ graphQLErrors, errorMessage }: ApolloErrorOptions) {
    super(errorMessage);
    this.name = "ApolloError";
    this.graphQLErrors = graphQLErrors || [];
    this.message = errorMessage || generateErrorMessage(this);
    this.cause = [...(graphQLErrors || [])].find((e) => !!e) || null;

    // We're not using `Object.setPrototypeOf` here as it isn't fully
    // supported on Android (see issue #3236).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (this as any).__proto__ = ApolloError.prototype;
  }
}

export interface GraphQLRequest<TVariables = Record<string, unknown>> {
  query: DocumentNode;
  variables?: TVariables;
}

export type GraphQLRequestTuple<TVariables = Record<string, unknown>> = [
  DocumentNode,
  TVariables?,
];

interface FetchResult<TData = Record<string, unknown>> {
  data?: TData | null;
  errors?: ReadonlyArray<GraphQLFormattedError>;
}

export type GraphQLTypeName = string;
export type GraphQLID = string;
export type RefString = `${GraphQLTypeName}:${GraphQLID}`;
export interface Reference {
  readonly __ref: RefString;
}

export const makeReference = (__ref: RefString): Reference => ({ __ref });

export const isReference = (obj: unknown): obj is Reference =>
  Boolean(
    obj &&
      typeof obj === "object" &&
      "__ref" in obj &&
      typeof obj.__ref === "string",
  );

export function graphQLResultHasError<T>(result: FetchResult<T>): boolean {
  const errors = getGraphQLErrorsFromResult(result);
  return isNonEmptyArray(errors);
}

export function getGraphQLErrorsFromResult<T>(result: FetchResult<T>) {
  const graphQLErrors = isNonEmptyArray(result.errors)
    ? result.errors.slice(0)
    : [];

  return graphQLErrors;
}

export const fetchGraphQLQuery = async <
  TData = Record<string, unknown>,
  TVariables = Record<string, unknown>,
>(
  query: DocumentNode,
  variables: TVariables | undefined,
  url: URL | string,
  init?: RequestInit,
): Promise<FetchResult<TData>> => {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: JSON.stringify({ variables, query: print(query) }),
    method: "POST",
  });

  const result = (await response.json()) as FetchResult<TData>;

  if (graphQLResultHasError(result)) {
    throw new ApolloError({
      graphQLErrors: getGraphQLErrorsFromResult(result),
    });
  }

  return result;
};
export const fetchGraphQLQueries = async <
  TData = Record<string, unknown>,
  TVariables = Record<string, unknown>,
>(
  requests: [DocumentNode, TVariables?][],
  url: URL | string,
  init?: RequestInit,
): Promise<FetchResult<TData>[]> => {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: JSON.stringify(
      requests.map(([query, variables]) => ({
        variables,
        query: print(query),
      })),
    ),
    method: "POST",
  });

  const results = (await response.json()) as FetchResult<TData>[];

  for (const result of results) {
    if (graphQLResultHasError(result)) {
      throw new ApolloError({
        graphQLErrors: getGraphQLErrorsFromResult(result),
      });
    }
  }

  return results;
};

export interface NormMap {
  readonly [key: string]: NormObj;
}

export type NormKey = string;

export type NormFieldValue =
  | NormKey
  // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
  | string
  | boolean
  | number
  | null
  | Reference
  | NormFieldValueArray;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NormFieldValueArray extends ReadonlyArray<NormFieldValue> {}

export interface NormObj {
  readonly [field: string]: null | NormFieldValue | Reference;
}

/**
 * An optimized function to merge two maps of normalized objects (as returned from normalize)
 * @param normMap The first normalized map
 * @param newNormMap The second normalized map
 */
export function merge(normMap: NormMap, newNormMap: NormMap): NormMap {
  const updatedNormMap = Object.keys(newNormMap).reduce(
    (stateSoFar, current) => {
      const newNormObj = {
        ...(normMap[current] || {}),
        ...newNormMap[current],
      };
      stateSoFar[current] = newNormObj;
      return stateSoFar;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as { [key: string]: any },
  );

  return { ...normMap, ...updatedNormMap };
}

export function getDocumentDefinitions(
  definitions: ReadonlyArray<DefinitionNode>,
): DocumentDefinitionTuple {
  let operationDefinition: OperationDefinitionNode | undefined = undefined;

  const fragmentMap: {
    [fragmentName: string]: FragmentDefinitionNode;
  } = {};
  for (const definition of definitions) {
    switch (definition.kind) {
      case Kind.OPERATION_DEFINITION:
        operationDefinition = definition;
        break;
      case Kind.FRAGMENT_DEFINITION:
        fragmentMap[definition.name.value] = definition;
        break;
      default:
        throw new Error("This is not an executable document");
    }
  }
  const rootFieldNode: FieldNodeWithSelectionSet = {
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: "data",
    },
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: operationDefinition!.selectionSet.selections,
    },
  };
  return [fragmentMap, rootFieldNode] as const;
}

export function expandFragments(
  obj: ResponseObject,
  selectionNodes: ReadonlyArray<SelectionNode>,
  fragmentMap: FragmentMap,
): ReadonlyArray<FieldNode> {
  const fieldNodes: Array<FieldNode> = [];

  for (const selectionNode of selectionNodes) {
    switch (selectionNode.kind) {
      case Kind.FIELD:
        fieldNodes.push(selectionNode);
        break;
      case Kind.INLINE_FRAGMENT: {
        const fragmentTypeName =
          selectionNode.typeCondition && selectionNode.typeCondition.name.value;
        const objTypeName = resolveType(obj);
        // Only include this fragment if the typename matches
        if (fragmentTypeName === objTypeName) {
          fieldNodes.push(
            ...expandFragments(
              obj,
              selectionNode.selectionSet.selections,
              fragmentMap,
            ),
          );
        }
        break;
      }
      case Kind.FRAGMENT_SPREAD: {
        const fragment = fragmentMap[selectionNode.name.value]!;
        const fragmentTypeName =
          fragment.typeCondition && fragment.typeCondition.name.value;
        const objTypeName = resolveType(obj);
        // Only include this fragment if the typename matches
        if (fragmentTypeName === objTypeName) {
          fieldNodes.push(
            ...expandFragments(
              obj,
              fragment.selectionSet.selections,
              fragmentMap,
            ),
          );
        }
        break;
      }
      default:
        throw new Error(
          "Unknown selection node field kind: " +
            (selectionNode as unknown as { kind: string }).kind,
        );
    }
  }
  return fieldNodes;
}

function resolveValueNode(
  valueNode: ValueNode,
  variables: Variables | undefined,
): string | boolean | number | ReadonlyArray<unknown> | object | null {
  switch (valueNode.kind) {
    case Kind.VARIABLE:
      return variables![valueNode.name.value]!;
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return valueNode.values.map((f) => resolveValueNode(f, variables));
    case Kind.OBJECT: {
      const valueObject: { [key: string]: unknown } = {};
      for (const field of valueNode.fields) {
        valueObject[field.name.value] = resolveValueNode(
          field.value,
          variables,
        );
      }
      return valueObject;
    }
    default:
      return valueNode.value;
  }
}

export function fieldNameWithArguments(
  fieldNode: FieldNode,
  variables: Variables | undefined,
): string {
  const argumentsObject: { [key: string]: unknown } = {};
  for (const argumentNode of fieldNode.arguments!) {
    argumentsObject[argumentNode.name.value] = resolveValueNode(
      argumentNode.value,
      variables,
    );
  }
  const hashedArgs = JSON.stringify(argumentsObject);
  return fieldNode.name.value + "(" + hashedArgs + ")";
}

const defaultGetObjectId: GetObjectId = (object: {
  readonly id: string;
  readonly __typename?: string;
}): GetObjectToIdResult => {
  return object.id === undefined
    ? undefined
    : `${object.__typename}:${object.id}`;
};

const resolveType: ResolveType = (object: {
  readonly __typename?: string;
}): string => {
  if (object.__typename === undefined) {
    throw new Error("__typename cannot be undefined.");
  }
  return object.__typename;
};

/**
 * Evaluates  @skip and @include directives on field
 * and returns true if the node should be included.
 */
export function shouldIncludeField(
  directives: ReadonlyArray<DirectiveNode>,
  variables: Variables = {},
): boolean {
  let finalInclude = true;
  for (const directive of directives) {
    let directiveInclude = true;
    if (directive.name.value === "skip" || directive.name.value === "include") {
      if (directive.arguments) {
        for (const arg of directive.arguments) {
          if (arg.name.value === "if") {
            let argValue: boolean;
            if (arg.value.kind === Kind.VARIABLE) {
              argValue = variables && !!variables[arg.value.name.value];
            } else if (arg.value.kind === Kind.BOOLEAN) {
              argValue = arg.value.value;
            } else {
              // The if argument must be of type Boolean!
              // http://facebook.github.io/graphql/June2018/#sec--skip
              throw new Error(
                `The if argument must be of type Boolean!, found '${arg.value.kind}'`,
              );
            }
            const argInclude =
              directive.name.value === "include" ? argValue : !argValue;
            directiveInclude = directiveInclude && argInclude;
          }
        }
      }
      finalInclude = finalInclude && directiveInclude;
    }
  }
  return finalInclude;
}
export interface Variables {
  readonly [name: string]: unknown;
}

export interface ResponseObject {
  readonly [key: string]: unknown;
}

export interface ResponseObject2 {
  readonly [key: string]: ResponseObjectFieldValue;
}

export type ResponseObjectFieldValue =
  | string
  | number
  | boolean
  | ResponseObject2
  | ResponseObjectArray;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ResponseObjectArray
  extends ReadonlyArray<ResponseObjectFieldValue> {}

export interface RootFields {
  readonly [rootField: string]: unknown;
}

export interface DenormalizationResult {
  readonly data: RootFields | undefined;
  readonly fields: FieldsMap;
}

export interface FieldsMap {
  readonly [key: string]: ReadonlySet<string>;
}

export interface FragmentMap {
  readonly [fragmentName: string]: FragmentDefinitionNode;
}
export type DocumentDefinitionTuple = readonly [
  FragmentMap,
  FieldNodeWithSelectionSet,
];

export interface FieldNodeWithSelectionSet extends FieldNode {
  readonly selectionSet: SelectionSetNode;
}

export type GetObjectToIdResult = string | undefined;

export type GetObjectId = (object: {
  readonly id?: string;
  readonly __typename?: string;
}) => GetObjectToIdResult;

export type ResolveType = (object: { readonly __typename?: string }) => string;

type MutableDeep<T> = { -readonly [P in keyof T]: MutableDeep<T[P]> }; // Remove readonly deep

type ParentNormObj = MutableDeep<NormObj>;
type MutableNormMap = MutableDeep<NormMap>;
type ResponseArray = ReadonlyArray<
  ResponseObject | ReadonlyArray<ResponseObject>
>;
type ResponseObjectOrArray = ResponseObject | ResponseArray;
type ParentNormObjOrArray = ParentNormObj | ParentArray;
type ParentArray = Array<NormFieldValue>;
type StackWorkItem = readonly [
  FieldNodeWithSelectionSet,
  ParentNormObjOrArray | undefined /*parentNormObj*/,
  ResponseObjectOrArray,
  string, // FallbackId
];

/**
 * Normalizes a graphql response.
 * @param query The graphql query document
 * @param variables The graphql query variables
 * @param response The graphql response
 * @param getObjectId Function to get normalized map key from an object
 * @param resolveType Function get get typeName from an object
 */
export function normalize(
  query: DocumentNode,
  variables: Variables | undefined,
  data: RootFields,
): NormMap {
  const [fragmentMap, rootFieldNode] = getDocumentDefinitions(
    query.definitions,
  );

  const stack: Array<StackWorkItem> = [];
  const normMap = Object.create(null) as MutableNormMap;

  // Seed stack with undefined parent and "fake" getObjectId
  stack.push([rootFieldNode, Object.create(null), data, "ROOT_QUERY"]);
  let getObjectIdToUse: GetObjectId = (_) => "ROOT_QUERY";

  // The stack has work items, depending on the work item we have four different cases to handle:
  // field + responseObject + parentNormObj = normalize(responseObject) => [ID, workitems] and parentNormObj[field] = ID
  // field + responseObject + parentArray  = normalize(responseObject) => [ID, workitems] and parentArray.push(ID)
  // field + responseArray  + parentNormObj = stack.push(workItemsFrom(responseArray)) and parentNormObj[field] = new Array()
  // field + responseArray  + parentArray  = stack.push(workItemsFrom(responseArray)) and parentArray.push(new Array())
  let firstIteration = true;
  while (stack.length > 0) {
    const [fieldNode, parentNormObjOrArray, responseObjectOrArray, fallbackId] =
      stack.pop()!;

    let keyOrNewParentArray: NormKey | ParentArray | null = null;
    if (responseObjectOrArray === null) {
      keyOrNewParentArray = null;
    } else if (!Array.isArray(responseObjectOrArray)) {
      const responseObject = responseObjectOrArray as ResponseObject;
      // console.log("responseObject", responseObject);
      const objectToIdResult = getObjectIdToUse(responseObject);
      keyOrNewParentArray = objectToIdResult ? objectToIdResult : fallbackId;
      // Get or create normalized object
      let normObj = normMap[keyOrNewParentArray];
      if (!normObj) {
        normObj = Object.create(null) as MutableDeep<NormObj>;
        normMap[keyOrNewParentArray] = normObj;
      }
      // Expand any fragments
      const expandedSelections = expandFragments(
        // @ts-expect-error -- ?
        responseObjectOrArray,
        fieldNode.selectionSet.selections,
        fragmentMap,
      );
      // For each field in the selection-set that has a sub-selection-set we push a work item.
      // For primtivies fields we set them directly on the normalized object.
      for (const field of expandedSelections) {
        // Check if this field should be skipped according to @skip and @include directives
        const include = field.directives
          ? shouldIncludeField(field.directives, variables)
          : true;
        if (include) {
          const responseFieldValue =
            responseObject[
              (field.alias && field.alias.value) || field.name.value
            ]!;
          const normFieldName =
            field.arguments && field.arguments.length > 0
              ? fieldNameWithArguments(field, variables)
              : field.name.value;
          if (responseFieldValue !== null && field.selectionSet) {
            // Put a work-item on the stack to normalize this field and set it on the normalized object
            stack.push([
              field as FieldNodeWithSelectionSet,
              normObj,
              // @ts-expect-error -- ?
              responseFieldValue,
              //path + "." + normFieldName
              // Use the current key plus fieldname as fallback id
              keyOrNewParentArray + "." + normFieldName,
            ]);
          } else {
            // This field is a primitive (not a array of normalized objects or a single normalized object)
            // @ts-expect-error -- ?
            normObj[normFieldName] = responseFieldValue;
          }
        }
      }
    } else {
      const responseArray = responseObjectOrArray as ResponseArray;
      keyOrNewParentArray = [];
      for (let i = 0; i < responseArray.length; i++) {
        stack.push([
          fieldNode,
          keyOrNewParentArray,
          responseArray[i]!,
          fallbackId + "." + i.toString(),
        ]);
      }
    }

    // Add to the parent, either field or an array
    if (Array.isArray(parentNormObjOrArray)) {
      const parentArray = parentNormObjOrArray;
      parentArray.unshift(
        typeof keyOrNewParentArray === "string"
          ? makeReference(keyOrNewParentArray as RefString)
          : keyOrNewParentArray,
      );
    } else {
      const key =
        fieldNode.arguments && fieldNode.arguments.length > 0
          ? fieldNameWithArguments(fieldNode, variables)
          : fieldNode.name.value;
      const parentNormObj = parentNormObjOrArray as ParentNormObj;
      parentNormObj[key] =
        typeof keyOrNewParentArray === "string"
          ? makeReference(keyOrNewParentArray as RefString)
          : keyOrNewParentArray;
    }

    // Use fake objectId function only for the first iteration, then switch to the real one
    if (firstIteration) {
      getObjectIdToUse = defaultGetObjectId;
      firstIteration = false;
    }
  }

  return normMap as NormMap;
}

export interface MongoGraphQLObject {
  __typename: string;
  id: string;
}

export const dereferenceDocument = async <
  D extends MongoGraphQLObject,
  R extends MongoGraphQLObject,
>(
  docRaw: D,
): Promise<R> => {
  const doc = { ...docRaw } as D & R;

  for (const key in doc) {
    if (isReference(doc[key])) {
      const [__typename, id] = doc[key].__ref.split(":") as [
        GraphQLID,
        GraphQLTypeName,
      ];
      const keyDoc = await TopLoggerGraphQL.findOne<MongoGraphQLObject>({
        __typename,
        id,
      });
      if (!keyDoc) {
        throw new Error(
          `Failed to dereference ${key} of ${doc.__typename}:${doc.id}`,
        );
      }
      doc[key] = await dereferenceDocument(keyDoc);
    }
  }

  return doc as R;
};

const parseDateFields = (doc: Record<string, unknown>) => {
  for (const key in doc) {
    const value = doc[key];
    if (typeof value === "string") {
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
        doc[key] = TZDate.tz("Etc/UTC", value);
      }
    }
  }
  return doc;
};

export const TopLoggerGraphQL = proxyCollection<
  (MongoGraphQLObject & { [key: string]: unknown }) | TopLoggerClimbUser
>("toplogger_graphql");

export async function normalizeAndUpsertQueryData(
  query: DocumentNode,
  variables: Variables | undefined,
  data: RootFields,
) {
  const objects = Object.values(normalize(query, variables, data)).filter(
    (o) => o.__typename && o.id,
  );
  for (const object of objects) {
    await TopLoggerGraphQL.updateOne(
      { __typename: object.__typename as string, id: object.id as string },
      { $set: parseDateFields(object) },
      { upsert: true },
    );
  }

  return objects;
}

export function workoutFromTopLoggerClimbUsers(
  climbUsers: WithId<TopLoggerClimbUserDereferenced>[],
): WithId<WorkoutData> {
  const firstClimbUser = climbUsers[0];
  if (!firstClimbUser) throw new Error("No climb users provided");

  const exercise = exercises.find(({ id }) => id === 2001)!;

  const colorOptions =
    exercise.inputs[1] &&
    "options" in exercise.inputs[1] &&
    exercise.inputs[1].options;

  return {
    _id: firstClimbUser._id,
    exercises: [
      {
        exerciseId: 2001,
        sets: climbUsers
          .filter(({ tickType }) => tickType >= 1)
          .map(({ tickType, climb: { grade }, holdColor: { nameLoc } }) => ({
            inputs: [
              // Grade
              { value: Number(grade / 100), unit: Unit.FrenchRounded },
              // Color
              {
                value:
                  (colorOptions
                    ? colorOptions?.findIndex(
                        ({ value }) => value === nameLoc?.toLowerCase(),
                      )
                    : undefined) ?? NaN,
              },
              // Sent-ness
              { value: tickType === 2 ? 0 : 1 },
            ],
          })),
      },
    ],
    location: firstClimbUser.climb.gym.name,
    userId: firstClimbUser.userId,
    createdAt: firstClimbUser.tickedFirstAtDate,
    updatedAt: firstClimbUser.tickedFirstAtDate,
    workedOutAt: firstClimbUser.tickedFirstAtDate,
    source: WorkoutSource.TopLogger2,
  };
}
