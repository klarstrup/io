"use client";

import {
  formatDistanceToNow,
  formatDistanceToNowStrict,
  intervalToDuration,
} from "date-fns";
import { useEffect, useState } from "react";
import useInterval from "../hooks/useInterval";
import { formatDurationAsTimer } from "../models/workout";

export function DistanceToNowStrict({
  date,
  addSuffix = true,
}: {
  date: Date;
  addSuffix?: boolean;
}) {
  const [state, setState] = useState<Record<string, never> | undefined>();

  useInterval(() => {
    setState({});
  }, 1000);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({});
  }, []);

  if (!date) return null;

  return state
    ? formatDistanceToNowStrict(date, { addSuffix })
    : date.toISOString();
}

export function DistanceToNow({ date }: { date: Date }) {
  const [state, setState] = useState<Record<string, never> | undefined>();

  useInterval(() => {
    setState({});
  }, 1000);

  if (!date) return null;

  return (
    <time dateTime={date.toISOString()} title={date.toISOString()}>
      {state
        ? formatDistanceToNow(date, { addSuffix: true })
        : date.toISOString()}
    </time>
  );
}

export function DistanceToNowShort({ date }: { date: Date }) {
  const [start, setNow] = useState(() => Date.now());

  useInterval(() => {
    setNow(Date.now());
  }, 500);

  if (!date) return null;

  return (
    <time dateTime={date.toISOString()} title={date.toISOString()}>
      {formatDurationAsTimer(
        intervalToDuration({ start, end: date.getTime() }),
      )}
    </time>
  );
}
