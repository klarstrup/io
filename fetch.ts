import { getDB } from "./dbConnect";

interface IFetch {
  fetchArgs: string;
  lastAttemptedFetchAt: Date;
  lastSuccessfulFetchAt: Date;
  lastFailedFetchAt: Date;
  lastResult: string;
  lastError: string;
}

// DB-backed fetch function that will return stale stuff
const rawDbFetch = async <T = string>(
  input: string | URL,
  init?: RequestInit | null,
  options?: {
    parseJson?: boolean;
    /**
     * The given number will be converted to an integer by rounding down.
     * By default, no maximum age is set and the preview session finishes
     * when the client shuts down (browser is closed).
     */
    maxAge?: number;
  },
): Promise<T> => {
  const sanitizedInit = init && {
    ...init,
    headers: init?.headers ? { ...init.headers, cookie: undefined } : undefined,
  };
  const fetchArgs = JSON.stringify({ input, init: sanitizedInit });
  const filter = { fetchArgs };
  const now = new Date();

  const db = await getDB();
  const fetchesCollection = db.collection<IFetch>("fetches");
  const fetchRow = await fetchesCollection.findOne(filter);
  let result: string | null = null;
  let parsedResult: T | null = null;
  let error: unknown;
  if (fetchRow) {
    // In seconds
    let stale = false;
    if (typeof options?.maxAge === "number") {
      const rowAge = Math.floor(
        (Number(now) - Number(fetchRow.lastSuccessfulFetchAt)) / 1000,
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

  try {
    if (!result) {
      await fetchesCollection.updateOne(
        filter,
        { $set: { lastAttemptedFetchAt: now } },
        { upsert: true },
      );
      console.info(
        `DB FETCHING ${String(input)} ${
          process.env.NODE_ENV === "production"
            ? ""
            : new Error("").stack
                ?.trim()
                .replace(
                  /at process.processTicksAndRejections \(node:internal\/process\/task_queues:95:5\)/g,
                  "",
                )
                .replace(/^Error/g, "")
                .replace(/webpack-internal:\/\/\/\(rsc\)\//g, "")
                .replace(/:\d+:\d+/g, "")
                .trim() || ""
        } `.trim(),
      );

      const response = await fetch(input, {
        signal: AbortSignal.timeout(10000),
        ...init,
        next: { revalidate: 0 },
      });
      if (
        response.status !== 200 &&
        // Don't consider 401s from the toplogger ascends endpoint as errors because
        // some users have their accounts set up to not allow access
        !(
          String(input).includes("api.toplogger.nu/v1/ascends.json") &&
          response.status === 401
        ) &&
        // Don't consider 404s from the toplogger holds endpoint as errors because
        // sometimes holds are removed from the database and i don't know
        // what i can do about it
        !(String(input).match(/\/holds\//) && response.status === 404)
      ) {
        error = await response.text();
        await fetchesCollection.updateOne(filter, {
          $set: {
            lastError: String(error),
            lastFailedFetchAt: now,
          },
        });
      } else {
        result = await response.text();
        parsedResult = (
          options?.parseJson === false ? result : JSON.parse(result)
        ) as T;
        if (
          String(input).includes("www.fitocracy.com") &&
          // @ts-expect-error - don't know how to fix this
          (("success" in parsedResult &&
            "error" in parsedResult &&
            parsedResult.success === false) ||
            // @ts-expect-error - don't know how to fix this
            ("error" in parsedResult && parsedResult.error))
        ) {
          error = parsedResult.error;
          parsedResult = null;
          await fetchesCollection.updateOne(filter, {
            $set: {
              lastError: String(error),
              lastFailedFetchAt: now,
            },
          });
        } else {
          await fetchesCollection.updateOne(filter, {
            $set: {
              lastResult: result,
              lastSuccessfulFetchAt: now,
            },
          });
        }
      }
    }
  } catch (err: unknown) {
    error = err;
  }
  if (error) {
    if (fetchRow && fetchRow.lastResult) {
      result = fetchRow.lastResult;
      parsedResult = (
        options?.parseJson === false ? result : JSON.parse(result)
      ) as T;
      console.warn(`DB FETCH FAILED, USED STALE DATA ${String(input)}`);
    } else {
      console.warn(`DB FETCH FAILED, NO STALE DATA ${String(input)}`);
    }
    console.error(error);
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
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      if (parsedError) throw parsedError;

      throw new Error(error);
    }
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw error || new Error("???");
  }

  return parsedResult;
};

const dbFetchCache = new Map<
  RequestInfo | URL,
  { promise: Promise<unknown>; date: Date }
>();
export const cachedDbFetch = async <T>(
  input: string | URL,
  init?: RequestInit | null,
  options?: {
    parseJson?: boolean;
    /**
     * The given number will be converted to an integer by rounding down.
     * By default, no maximum age is set and the preview session finishes
     * when the client shuts down (browser is closed).
     */
    maxAge?: number;
  },
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
    const promise = rawDbFetch<T>(input, init, options).catch(() =>
      dbFetchCache.delete(key),
    );
    entry = { promise, date: new Date() };
    dbFetchCache.set(key, entry);
  } else {
    // console.info(`cachedDbFetch HIT ${String(input)}`);
  }

  return entry.promise as Promise<T>;
};

export const dbFetch = cachedDbFetch;
