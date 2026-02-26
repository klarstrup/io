"use client";

import { useMemo } from "react";
import { GQFloatTimeSeriesEntry } from "../graphql.generated";
import { useNow } from "../hooks";

const getAvg = (arr: number[]) =>
  arr.reduce((acc, c) => acc + c, 0) / arr.length;

function baseSum(
  array: number[],
  iteratee: (value: number) => number | undefined,
): number | undefined {
  let result: number | undefined;
  let index = -1;
  const length = array.length;

  while (++index < length) {
    const current = iteratee(array[index]!);
    if (current !== undefined) {
      result = result === undefined ? current : result + current;
    }
  }
  return result!;
}

function sumBy(array: number[], iteratee?: (value: number) => number): number {
  return array && array.length ? baseSum(array, iteratee || ((x) => x))! : 0;
}

function createTrend(data: { timestamp: Date; value: number }[]) {
  const xData: number[] = [];
  const yData: number[] = [];
  for (const { timestamp, value } of data) {
    xData.push(timestamp.getTime());
    yData.push(value);
  }

  // average of X values and Y values
  const xMean = getAvg(xData);
  const yMean = getAvg(yData);

  // Subtract X or Y mean from corresponding axis value
  const xMinusxMean = xData.map((val) => val - xMean);
  const yMinusyMean = yData.map((val) => val - yMean);

  const xMinusxMeanSq = xMinusxMean.map((val) => Math.pow(val, 2));

  const xy: number[] = [];
  for (let x = 0; x < data.length; x++) {
    xy.push(xMinusxMean[x]! * yMinusyMean[x]!);
  }

  const xySum = sumBy(xy);

  // b1 is the slope
  const b1 = xySum / sumBy(xMinusxMeanSq);
  // b0 is the start of the slope on the Y axis
  const b0 = yMean - b1 * xMean;

  return { slope: b1, yStart: b0, calcY: (x: number) => b0 + b1 * x };
}

export default function useTrendingNumber(
  timeSeries: GQFloatTimeSeriesEntry[],
  updateInterval = 10000,
) {
  const now = useNow(updateInterval);

  // Predict the current value by regressing from the series and extrapolating from the newest point to now
  const trend = useMemo(() => createTrend(timeSeries), [timeSeries]);

  return { value: trend.calcY(now.getTime()), ...trend };
}
