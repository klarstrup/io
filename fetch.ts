import mongoose from "mongoose";

const fetchSchema = new mongoose.Schema({
  fetchArgs: String,
  lastAttemptedFetchAt: Date,
  lastSuccessfulFetchAt: Date,
  lastFailedFetchAt: Date,
  lastResult: String,
  lastError: String,
});

export const Fetch = mongoose.model("Fetch", fetchSchema, undefined, {
  overwriteModels: true,
});

const fetchCache = new Map<RequestInfo | URL, Promise<Response>>();
const cachedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const key = JSON.stringify({ input, init });

  let promise = fetchCache.get(key);

  if (!promise) {
    promise = fetch(input, init);
    fetchCache.set(key, promise);
  }

  return promise.then((r) => r.clone());
};

// DB-backed fetch function that will return stale stuff
const rawDbFetch = async <T = string>(
  input: string | URL,
  init?: RequestInit,
  options?: {
    parseJson?: boolean;
    /**
     * The given number will be converted to an integer by rounding down.
     * By default, no maximum age is set and the preview session finishes
     * when the client shuts down (browser is closed).
     */
    maxAge?: number;
  }
): Promise<T> => {
  const sanitizedInit = init && {
    ...init,
    headers: init?.headers ? { ...init.headers, cookie: undefined } : undefined,
  };
  const fetchArgs = JSON.stringify({ input, init: sanitizedInit });
  const filter = { fetchArgs };
  const now = new Date();

  const fetchRow = await Fetch.findOne(filter);
  let result: string | null = null;
  let parsedResult: T | null = null;
  let error: unknown;
  if (fetchRow) {
    // In seconds
    let stale = false;
    if (typeof options?.maxAge === "number") {
      const rowAge = Math.floor(
        (Number(now) - Number(fetchRow.lastSuccessfulFetchAt)) / 1000
      );
      if (rowAge > options.maxAge || options.maxAge === 0) stale = true;
    }
    if (!stale) {
      if (fetchRow.lastResult) {
        result = fetchRow.lastResult;
        parsedResult = (
          options?.parseJson === false ? result : JSON.parse(result)
        ) as T;
        // console.info(`DB HIT ${String(input)}`);
      }
    } else {
      console.info(`DB STALE ${String(input)}`);
    }
  }

  if (!result) {
    await Fetch.updateOne(
      filter,
      { lastAttemptedFetchAt: now },
      { upsert: true }
    );
    console.info(`DB FETCHING ${String(input)}`);
    const response = await (process.env.NODE_ENV === "development" ||
      process.env.CI
      ? cachedFetch
      : fetch)(input, {
      ...init,
      next:
        options?.maxAge !== undefined
          ? { revalidate: options.maxAge }
          : undefined,
    });
    if (
      response.status !== 200 &&
      // Don't consider 401s from the toplogger ascends endpoint as errors because
      // some users have their accounts set up to not allow access
      !(
        String(input).includes("api.toplogger.nu/v1/ascends.json") &&
        response.status === 401
      )
    ) {
      error = await response.text();
      await Fetch.updateOne(filter, {
        lastError: error,
        lastFailedFetchAt: now,
      });
    } else {
      result = await response.text();
      parsedResult = (
        options?.parseJson === false ? result : JSON.parse(result)
      ) as T;
      await Fetch.updateOne(filter, {
        lastResult: result,
        lastSuccessfulFetchAt: now,
      });
    }
  }
  if (!parsedResult) {
    if (error instanceof Error) throw error;
    if (typeof error === "string") {
      let parsedError: unknown;
      try {
        parsedError = JSON.parse(error);
      } catch {
        /* empty */
      }
      if (parsedError) throw parsedError;

      throw new Error(error);
    }
    throw error || new Error("???");
  }

  return parsedResult;
};

const dbFetchCache = new Map<
  RequestInfo | URL,
  { promise: Promise<never>; date: Date }
>();
export const cachedDbFetch = async <T>(
  input: string | URL,
  init?: RequestInit,
  options?: {
    parseJson?: boolean;
    /**
     * The given number will be converted to an integer by rounding down.
     * By default, no maximum age is set and the preview session finishes
     * when the client shuts down (browser is closed).
     */
    maxAge?: number;
  }
): Promise<T> => {
  const key = JSON.stringify({ input, init });
  let entry = dbFetchCache.get(key);

  if (
    !entry ||
    (typeof options?.maxAge !== "undefined" &&
      (options.maxAge === 0 ||
        Math.floor((Number(new Date()) - Number(entry.date)) / 1000) >
          options.maxAge))
  ) {
    // console.info(`cachedDbFetch MISS ${String(input)}`);
    const promise = rawDbFetch<never>(input, init, options);
    entry = { promise, date: new Date() };
    dbFetchCache.set(key, entry);
  } else {
    // console.info(`cachedDbFetch HIT ${String(input)}`);
  }

  return entry.promise;
};

export const dbFetch = cachedDbFetch;

export const fetchJson = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> =>
  fetch(input, init)
    .then((r) => r.text())
    .then((t) => {
      try {
        return JSON.parse(t) as T;
      } catch (e) {
        return t as T;
      }
    });
