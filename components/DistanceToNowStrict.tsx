"use client";

import { formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
import { useEffect, useState } from "react";
import useInterval from "../hooks/useInterval";

export function DistanceToNowStrict({ date }: { date: Date }) {
  const [state, setState] = useState<Record<string, never> | undefined>();

  useInterval(() => {
    setState({});
  }, 1000);
  useEffect(() => {
    setState({});
  }, []);

  if (!date) return null;

  return state
    ? formatDistanceToNowStrict(date, { addSuffix: true })
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
