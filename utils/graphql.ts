import {
  DocumentNode,
  GraphQLErrorExtensions,
  GraphQLFormattedError,
  print,
} from "graphql";

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

interface Reference {
  readonly __ref: string;
}

export const makeReference = (id: string): Reference => ({ __ref: String(id) });

export const isReference = (obj: unknown): obj is Reference =>
  Boolean(
    obj &&
      typeof obj === "object" &&
      "__ref" in obj &&
      typeof obj.__ref === "string",
  );

export function isNonEmptyArray<T>(value?: ArrayLike<T>): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

export function isNonNullObject(
  obj: unknown,
): obj is Record<string | number, unknown> {
  return obj !== null && typeof obj === "object";
}

export function isPlainObject(
  obj: unknown,
): obj is Record<string | number, unknown> {
  return (
    obj !== null &&
    typeof obj === "object" &&
    (Object.getPrototypeOf(obj) === Object.prototype ||
      Object.getPrototypeOf(obj) === null)
  );
}

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
