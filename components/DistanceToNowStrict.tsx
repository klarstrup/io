"use client";

import {
  formatDistanceToNow,
  formatDistanceToNowStrict,
  intervalToDuration,
} from "date-fns";
import { useNow } from "../hooks";
import { useIsSSR } from "../hooks/useIsSSR";
import { formatDurationAsTimer } from "../models/workout";

export function DistanceToNowStrict({
  date,
  addSuffix = true,
}: {
  date: Date;
  addSuffix?: boolean;
}) {
  useNow(1000);
  const isSSR = useIsSSR();

  if (!date) return null;

  return !isSSR
    ? formatDistanceToNowStrict(date, { addSuffix })
    : date.toISOString();
}

export function DistanceToNow({ date }: { date: Date }) {
  useNow(1000);
  const isSSR = useIsSSR();

  if (!date) return null;

  return (
    <time dateTime={date.toISOString()} title={date.toISOString()}>
      {!isSSR
        ? formatDistanceToNow(date, { addSuffix: true })
        : date.toISOString()}
    </time>
  );
}

export function DistanceToNowShort({ date }: { date: Date }) {
  const start = useNow();

  if (!date) return null;

  return (
    <time dateTime={date.toISOString()} title={date.toISOString()}>
      {formatDurationAsTimer(
        intervalToDuration({ start, end: date.getTime() }),
      )}
    </time>
  );
}
