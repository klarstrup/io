import { differenceInDays, isWithinInterval, type Interval } from "date-fns";

export class RelativeURL extends URL {
  constructor(url: string | URL) {
    super(url, "http://n");
  }
  override toString() {
    return super.toString().replace("http://n", "");
  }
  override get href() {
    return this.toString();
  }
}

export const percentile = (rank: number, tally: number) =>
  ((1 - rank / tally) * 100).toLocaleString("en-DK", {
    unit: "percent",
    maximumSignificantDigits: 2,
  });

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function chunk<I>(rawArr: I[], size: number) {
  const arr = Array.from(rawArr);
  const results: I[][] = [];

  while (arr.length) results.push(arr.splice(0, size));

  return results;
}

export const MINUTE_IN_SECONDS = 60;
export const HOUR_IN_SECONDS = MINUTE_IN_SECONDS * 60;
export const DAY_IN_SECONDS = HOUR_IN_SECONDS * 24;
export const WEEK_IN_SECONDS = DAY_IN_SECONDS * 7;

export function seconds2time(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds - hours * 3600) / 60);
  seconds = seconds - hours * 3600 - minutes * 60;

  return `${hours ? `${hours}:` : ""}${
    minutes < 10 ? `0${minutes}` : String(minutes)
  }:${seconds < 10 ? `0${seconds}` : String(seconds)}`;
}

export const cotemporality = (interval: Interval, now = Date.now()) =>
  new Date(interval.start).getTime() < now
    ? now < new Date(interval.end).getTime()
      ? "current"
      : "past"
    : "future";

export async function arrayFromAsyncIterable<T>(
  gen: AsyncIterable<T>
): Promise<T[]> {
  const out: T[] = [];
  for await (const x of gen) out.push(x);
  return out;
}
export function jsonReadableStreamFromAsyncIterable<T>(
  iterable: AsyncGenerator<T, T[]>
) {
  const responseStream = new TransformStream<Uint8Array, string>();
  const writer = responseStream.writable.getWriter();
  (async () => {
    const encoder = new TextEncoder();

    await writer.write(encoder.encode("["));
    let first = true;
    for await (const object of iterable) {
      if (first) {
        first = false;
      } else {
        await writer.write(encoder.encode(","));
      }
      await writer.write(encoder.encode(JSON.stringify(object)));
    }
    await writer.write(encoder.encode("]"));

    await writer.close();
  })().catch(() => {});

  return responseStream.readable;
}

export const shuffle = <A>(arrRaw: A[]): A[] => {
  const arr = [...arrRaw];
  return arr.reduceRight<A[]>((acc) => {
    acc.push(arr.splice(0 | (Math.random() * arr.length), 1)[0]!);
    return acc;
  }, []);
};

export const getMaxAgeFactor = (eventInterval: Interval, now = Date.now()) =>
  isWithinInterval(new Date(), eventInterval)
    ? 1
    : Math.max(
        Math.abs(differenceInDays(now, eventInterval.start)),
        Math.abs(differenceInDays(now, eventInterval.end))
      ) * 10;
