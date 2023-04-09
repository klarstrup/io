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

const fetchCache = new Map<RequestInfo | URL, Promise<any>>();
const cachedFetch = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> => {
  const key = JSON.stringify({ input, init });
  if (!fetchCache.has(key)) fetchCache.set(key, fetch(input, init));

  return fetchCache.get(key)!;
};

// DB-backed fetch function that will return stale stuff
const rawDbFetch = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  cacheOptions?: {
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
  let fetchRow = await Fetch.findOne(filter);
  let result: string | null = null;
  let resultJson: T;
  let error: unknown;
  if (fetchRow) {
    // In seconds
    let stale = false;
    if (typeof cacheOptions?.maxAge === "number") {
      const rowAge = Math.floor(
        (Number(now) - Number(fetchRow.lastSuccessfulFetchAt)) / 1000
      );
      if (rowAge > cacheOptions.maxAge) {
        stale = true;
      }
    }
    if (!stale) {
      if (fetchRow.lastResult) {
        result = fetchRow.lastResult;
        resultJson = JSON.parse(result);
        console.info(`DB HIT ${input}`);
      }
    } else {
      console.info(`DB STALE ${input}`);
    }
  }

  if (!result) {
    await Fetch.updateOne(
      filter,
      { lastAttemptedFetchAt: now },
      { upsert: true }
    );
    console.info(`DB FETCHING ${input}`);
    const response = await (process.env.NODE_ENV === "development"
      ? cachedFetch
      : fetch)(input, {
      ...init,
      next:
        cacheOptions?.maxAge !== undefined
          ? { revalidate: cacheOptions?.maxAge }
          : undefined,
    });
    if (response.status !== 200) {
      error = await response.text();
      await Fetch.updateOne(filter, {
        lastError: error,
        lastFailedFetchAt: now,
      });
    } else {
      result = await response.text();
      resultJson = JSON.parse(result);
      await Fetch.updateOne(filter, {
        lastResult: result,
        lastSuccessfulFetchAt: now,
      });
    }
  }
  return resultJson!;
};

const dbFetchCache = new Map<RequestInfo | URL, Promise<any>>();
export const cachedDbFetch = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  cacheOptions?: {
    /**
     * The given number will be converted to an integer by rounding down.
     * By default, no maximum age is set and the preview session finishes
     * when the client shuts down (browser is closed).
     */
    maxAge?: number;
  }
): Promise<T> => {
  const key = JSON.stringify({ input, init });
  if (!dbFetchCache.has(key)) {
    console.info("cachedDbFetch MISS " + input);
    dbFetchCache.set(key, rawDbFetch(input, init, cacheOptions));
  } else {
    console.info("cachedDbFetch HIT " + input);
  }

  return dbFetchCache.get(key)!;
};

export const dbFetch =
  process.env.NODE_ENV === "development" ? cachedDbFetch : rawDbFetch;

export const fetchJson = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> =>
  fetch(input, init)
    .then((r) => r.text())
    .then((t) => {
      try {
        return JSON.parse(t);
      } catch (e) {
        return t;
      }
    });
