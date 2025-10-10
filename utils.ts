import { TZDate } from "@date-fns/tz";
import {
  addDays,
  type ContextOptions,
  differenceInDays,
  type Interval,
  isDate,
  isWithinInterval,
  type RoundingMethod,
  type RoundingOptions,
  startOfDay,
} from "date-fns";
import type { DateInterval } from "./lib";

export const dateToString = (date: Date): `${number}-${number}-${number}` =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

export const DEFAULT_TIMEZONE = "Europe/Copenhagen";

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

export function unique<T>(arr: T[] | Readonly<T[]>): T[] {
  return Array.from(new Set(arr));
}

export function uniqueBy<T>(arr: T[], predicate: (item: T) => unknown): T[] {
  return Array.from(
    arr
      .reduce((map, item) => {
        const key = predicate(item);
        if (!map.has(key)) map.set(key, item);

        return map;
      }, new Map<unknown, T>())
      .values(),
  );
}

export function chunk<I>(rawArr: I[], size: number) {
  if (!Array.isArray(rawArr)) throw new Error("Expected an array");

  const arr = Array.from(rawArr);
  const results: I[][] = [];

  while (arr.length) results.push(arr.splice(0, size));

  return results;
}

export const randomSlice = <T>(array: T[], slices: number) =>
  shuffle(chunk(array, Math.ceil(array.length / slices)))[0] || [];

export const randomSliceOfSize = <T>(array: T[], size: number) =>
  shuffle(chunk(array, size))[0] || [];

export const MINUTE_IN_SECONDS = 60;
export const HOUR_IN_SECONDS = MINUTE_IN_SECONDS * 60;
export const DAY_IN_SECONDS = HOUR_IN_SECONDS * 24;
export const WEEK_IN_SECONDS = DAY_IN_SECONDS * 7;

export function seconds2time(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds - hours * 3600) / 60);
  seconds = Math.floor(seconds - hours * 3600 - minutes * 60);

  return `${hours ? `${hours}:` : ""}${
    hours && minutes < 10 ? `0${minutes}` : String(minutes)
  }:${seconds < 10 ? `0${seconds}` : String(seconds)}`;
}

export const cotemporality = (interval: DateInterval, now = Date.now()) =>
  interval.start.getTime() < now
    ? now < interval.end.getTime()
      ? "current"
      : "past"
    : "future";

export async function arrayFromAsyncIterable<T>(
  gen: AsyncIterable<T>,
): Promise<T[]> {
  const out: T[] = [];
  for await (const x of gen) out.push(x);
  return out;
}
export function jsonReadableStreamFromAsyncIterable<T>(
  iterable: AsyncGenerator<T, T[]>,
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
        Math.abs(differenceInDays(now, eventInterval.end)),
      ) * 10;

export const allPromises = <
  T extends readonly ((() => Promise<unknown>) | Promise<unknown>)[],
>(
  ...values: T
): Promise<{
  -readonly [P in keyof T]: Awaited<
    T[P] extends () => Promise<unknown> ? ReturnType<T[P]> : T[P]
  >;
}> =>
  Promise.all(
    values.map((value) => (typeof value === "function" ? value() : value)),
  ) as Promise<{
    -readonly [P in keyof T]: Awaited<
      T[P] extends () => Promise<unknown> ? ReturnType<T[P]> : T[P]
    >;
  }>;

interface OmitF {
  <T extends object, K extends [...(keyof T)[]]>(
    obj: T,
    ...keys: K
  ): {
    [K2 in Exclude<keyof T, K[number]>]: T[K2];
  };
}

export const omit: OmitF = (obj, ...keys) => {
  const ret = {} as { [K in keyof typeof obj]: (typeof obj)[K] };
  let key: keyof typeof obj;
  for (key in obj) {
    if (!keys.includes(key)) {
      ret[key] = obj[key];
    }
  }
  return ret;
};

export function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
  const ret: Partial<Pick<T, K>> = {};
  for (const key of keys) ret[key] = obj[key];

  return ret as Pick<T, K>;
}

export function encodeGeohash(
  lat: number | string,
  lon: number | string,
  precision: number,
) {
  lat = Number(lat);
  lon = Number(lon);
  precision = Number(precision);

  if (isNaN(lat) || isNaN(lon) || isNaN(precision))
    throw new Error("Invalid geohash");

  let idx = 0; // index into base32 map
  let bit = 0; // each char holds 5 bits
  let evenBit = true;
  let geohash = "";

  let latMin = -90,
    latMax = 90;
  let lonMin = -180,
    lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      // bisect E-W longitude
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) {
        idx = idx * 2 + 1;
        lonMin = lonMid;
      } else {
        idx = idx * 2;
        lonMax = lonMid;
      }
    } else {
      // bisect N-S latitude
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = idx * 2 + 1;
        latMin = latMid;
      } else {
        idx = idx * 2;
        latMax = latMid;
      }
    }
    evenBit = !evenBit;

    if (++bit == 5) {
      // 5 bits gives us a character: append it and start over
      geohash += BASE32_CODES.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}
const BASE32_CODES = "0123456789bcdefghjkmnpqrstuvwxyz";
const BASE32_CODES_DICT: Record<string, number> = {};
for (let i = 0; i < BASE32_CODES.length; i++)
  BASE32_CODES_DICT[BASE32_CODES.charAt(i)] = i;
export function decodeGeohashBounds(hashString: string) {
  let isLon = true,
    maxLat = 90,
    minLat = -90,
    maxLon = 180,
    minLon = -180,
    mid: number;

  for (let i = 0, l = hashString.length; i < l; i++) {
    for (let bits = 4; bits >= 0; bits--) {
      const code = BASE32_CODES_DICT[hashString[i]!.toLowerCase()];
      if (code === undefined) throw new Error("Invalid geohash");

      const bit = (code >> bits) & 1;

      if (isLon) {
        mid = (maxLon + minLon) / 2;
        if (bit === 1) {
          minLon = mid;
        } else {
          maxLon = mid;
        }
      } else {
        mid = (maxLat + minLat) / 2;
        if (bit === 1) {
          minLat = mid;
        } else {
          maxLat = mid;
        }
      }
      isLon = !isLon;
    }
  }

  return { east: maxLon, west: minLon, north: maxLat, south: minLat };
}
export function decodeGeohash(hashString: string) {
  const { east, west, north, south } = decodeGeohashBounds(hashString);

  return { latitude: (south + north) / 2, longitude: (west + east) / 2 };
}

/**
 * Sunrise/sunset script. By Matt Kane. Adopted for NPM use by Alexey Udivankin.
 *
 * Based loosely and indirectly on Kevin Boone's SunTimes Java implementation
 * of the US Naval Observatory's algorithm.
 *
 * Copyright © 2012 Triggertrap Ltd. All rights reserved.
 *
 * This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General
 * Public License as published by the Free Software Foundation; either version 2.1 of the License, or (at your option)
 * any later version.
 *
 * This library is distributed in the hope that it will be useful,but WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for more
 * details.
 * You should have received a copy of the GNU Lesser General Public License along with this library; if not, write to
 * the Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA,
 * or connect to: http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 */

/**
 * Default zenith
 */
const DEFAULT_ZENITH = 91.05; // This gives a result similar to Tomorrow.io
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_ZENITH_OLD = 90.8333; // This is the value used by the original implementation

/**
 * Degrees per hour
 */
const DEGREES_PER_HOUR = 360 / 24;

/**
 * Msec in hour
 */
const MSEC_IN_HOUR = 60 * 60 * 1000;

/**
 * Msec in day
 */
const MSEC_IN_DAY = 8.64e7;

/**
 * Get day of year
 */
const getDayOfYear = (date: Date) =>
  Math.ceil(
    (date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) /
      MSEC_IN_DAY,
  );

const sinDeg = (deg: number) => Math.sin((deg * 2.0 * Math.PI) / 360.0);
const acosDeg = (x: number) => (Math.acos(x) * 360.0) / (2 * Math.PI);
const asinDeg = (x: number) => (Math.asin(x) * 360.0) / (2 * Math.PI);
const tanDeg = (deg: number) => Math.tan((deg * 2.0 * Math.PI) / 360.0);
const cosDeg = (deg: number) => Math.cos((deg * 2.0 * Math.PI) / 360.0);

/**
 * Get ramainder
 */
function mod(a: number, b: number): number {
  const result = a % b;

  return result < 0 ? result + b : result;
}

/**
 * Calculate Date for either sunrise or sunset
 */
function calculate(
  latitude: number,
  longitude: number,
  isSunrise: boolean,
  zenith: number,
  date: TZDate,
): Date {
  const dayOfYear = getDayOfYear(date);
  const hoursFromMeridian = longitude / DEGREES_PER_HOUR;
  const approxTimeOfEventInDays = isSunrise
    ? dayOfYear + (6 - hoursFromMeridian) / 24
    : dayOfYear + (18.0 - hoursFromMeridian) / 24;

  const sunMeanAnomaly = 0.9856 * approxTimeOfEventInDays - 3.289;
  const sunTrueLongitude = mod(
    sunMeanAnomaly +
      1.916 * sinDeg(sunMeanAnomaly) +
      0.02 * sinDeg(2 * sunMeanAnomaly) +
      282.634,
    360,
  );
  const ascension = 0.91764 * tanDeg(sunTrueLongitude);

  let rightAscension = (360 / (2 * Math.PI)) * Math.atan(ascension);
  rightAscension = mod(rightAscension, 360);

  const lQuadrant = Math.floor(sunTrueLongitude / 90) * 90;
  const raQuadrant = Math.floor(rightAscension / 90) * 90;
  rightAscension = rightAscension + (lQuadrant - raQuadrant);
  rightAscension /= DEGREES_PER_HOUR;

  const sinDec = 0.39782 * sinDeg(sunTrueLongitude);
  const cosDec = cosDeg(asinDeg(sinDec));
  const cosLocalHourAngle =
    (cosDeg(zenith) - sinDec * sinDeg(latitude)) / (cosDec * cosDeg(latitude));

  const localHourAngle = isSunrise
    ? 360 - acosDeg(cosLocalHourAngle)
    : acosDeg(cosLocalHourAngle);

  const localHour = localHourAngle / DEGREES_PER_HOUR;
  const localMeanTime =
    localHour + rightAscension - 0.06571 * approxTimeOfEventInDays - 6.622;
  const time = mod(localMeanTime - longitude / DEGREES_PER_HOUR, 24);
  const utcMidnight = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  return new TZDate(
    utcMidnight + time * MSEC_IN_HOUR,
    date.timeZone || DEFAULT_TIMEZONE,
  );
}

/**
 * Calculate Sunrise time for given longitude, latitude, zenith and date
 */
export const getSunrise = (latitude: number, longitude: number, date: TZDate) =>
  calculate(latitude, longitude, true, DEFAULT_ZENITH, date);

/**
 * Calculate Sunset time for given longitude, latitude, zenith and date
 */
export const getSunset = (latitude: number, longitude: number, date: TZDate) =>
  calculate(latitude, longitude, false, DEFAULT_ZENITH, date);

const getRoundingMethod =
  (method: RoundingMethod | undefined): ((number: number) => number) =>
  (number) => {
    const round = method ? Math[method] : Math.trunc;
    const result = round(number);
    // Prevent negative zero
    return result === 0 ? 0 : result;
  };

export interface RoundToNearestDaysOptions<DateType extends Date = Date>
  extends RoundingOptions,
    ContextOptions<DateType> {}
export function roundToNearestDay<
  DateType extends Date,
  ResultDate extends Date = DateType,
>(date: DateType, options?: RoundToNearestDaysOptions<ResultDate>): ResultDate {
  const hours =
    date.getHours() +
    date.getMinutes() / 60 +
    date.getSeconds() / 60 / 60 +
    date.getMilliseconds() / 1000 / 60 / 60;

  const roundingMethod = getRoundingMethod(options?.roundingMethod ?? "round");

  return addDays(
    startOfDay(date, { in: options?.in }),
    roundingMethod(hours / 24),
  );
}

function stringToColours(inputString: string) {
  let sum = 0;

  for (let i = 0; i < inputString.length; i++) {
    sum += inputString.charCodeAt(i);
  }

  const r = ~~(
    Number(
      "0." +
        Math.sin(sum + 1)
          .toString()
          .substr(6),
    ) * 256
  );
  const g = ~~(
    Number(
      "0." +
        Math.sin(sum + 2)
          .toString()
          .substr(6),
    ) * 256
  );
  const b = ~~(
    Number(
      "0." +
        Math.sin(sum + 3)
          .toString()
          .substr(6),
    ) * 256
  );

  return [r, g, b, 255] as const;
}
export function stringToColour(inputString: string, alpha = 1) {
  const [r, g, b] = stringToColours(inputString);
  return `rgba(${r},${g},${b},${alpha})`;
}

const schemeCategory10 = [
  "#4074E2",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
] as const;
export const getSchemeCategory10Color = (index: number) =>
  schemeCategory10[index % schemeCategory10.length]!;

export const isNonEmptyArray = <T>(
  value?: ArrayLike<T> | null,
): value is [T, ...T[]] => Array.isArray(value) && value.length > 0;

export const isNonNullObject = (
  obj: unknown,
): obj is Record<string | number, unknown> =>
  obj !== null && typeof obj === "object";

export const isPlainObject = (
  obj: unknown,
): obj is Record<string | number, unknown> => {
  if (obj !== null && typeof obj === "object") {
    const prototype = Object.getPrototypeOf(obj) as unknown;

    if (prototype === Object.prototype || prototype === null) {
      return true;
    }
  }

  return false;
};

export const rangeToQuery = (from: Date, to?: Date) =>
  to ? { $gte: from, $lte: to } : { $gte: from };

export function countBy<T extends { [K in keyof T]: T[K] }, K extends keyof T>(
  list: T[],
  prop: K,
): { [key in T[K]]: number } {
  const acc = {} as { [key in T[K]]: number };
  for (let i = 0; i < list.length; i++) {
    const key = list[i]![prop];
    acc[key] = (acc[key] ?? 0) + 1;
  }
  return acc;
}

export const parseDateFields = (doc: Record<string, unknown>) => {
  for (const key in doc) {
    const value = doc[key];
    doc[key] =
      typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)
        ? new Date(value)
        : isNonNullObject(value)
          ? parseDateFields(value)
          : value;
  }
  return doc;
};

export const colorNameToEmoji = (colorName?: string) =>
  colorName === "mint"
    ? "🩵"
    : colorName === "yellow"
      ? "💛"
      : colorName === "green"
        ? "💚"
        : colorName === "red"
          ? "❤️"
          : colorName === "purple"
            ? "💜"
            : colorName === "orange"
              ? "🧡"
              : colorName === "white"
                ? "🤍"
                : colorName === "pink"
                  ? "🩷"
                  : colorName === "blue"
                    ? "💙"
                    : colorName === "black"
                      ? "🖤"
                      : colorName;
export const colorNameToHTMLColor = (color?: string) =>
  color === "mint"
    ? "#00E0E6"
    : color === "yellow"
      ? "#FFDE00"
      : color === "green"
        ? "#0CE600"
        : color === "red"
          ? "#E60000"
          : color === "purple"
            ? "#800080"
            : color === "orange"
              ? "#FF9B2F"
              : color === "white"
                ? "#FFEFC1"
                : color === "pink"
                  ? "#F0F"
                  : color;

const getAverage = (arr: Array<number>) =>
  arr.reduce<number>((acc, c) => acc + c, 0) / arr.length;

export const getSum = (arr: Array<number>) =>
  arr.reduce((acc, c) => acc + c, 0);

export const getLimits = (array: Array<number>): [min: number, max: number] => {
  let min = Number.MAX_SAFE_INTEGER,
    max = Number.MIN_SAFE_INTEGER;

  for (const value of array) {
    min = value < min ? value : min;
    max = value > max ? value : max;
  }

  return [min, max] as const;
};

export function createTrend(data: Array<{ x: number | Date; y: number }>): {
  slope: number;
  yStart: number;
  calcY: (x: number) => number;
} {
  const xData: number[] = [];
  const yData: number[] = [];
  for (const { x, y } of data) {
    xData.push(isDate(x) ? x.valueOf() : x);
    yData.push(y);
  }

  // average of X values and Y values
  const xMean = getAverage(xData);
  const yMean = getAverage(yData);

  // Subtract X or Y mean from corresponding axis value
  const xMinusxMean: number[] = [];
  const yMinusyMean: number[] = [];
  for (let i = 0; i < data.length; i++) {
    xMinusxMean.push(xData[i]! - xMean);
    yMinusyMean.push(yData[i]! - yMean);
  }

  const xMinusxMeanSq = xMinusxMean.map((val) => Math.pow(val, 2));

  const xy: Array<number> = [];
  for (let i = 0; i < data.length; i++) {
    xy.push(xMinusxMean[i]! * yMinusyMean[i]!);
  }

  // b1 is the slope
  const slope = getSum(xy) / getSum(xMinusxMeanSq);
  // b0 is the start of the slope on the Y axis
  const yStart = yMean - slope * xMean;

  return { slope, yStart, calcY: (x: number) => yStart + slope * x };
}
