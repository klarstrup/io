"use client";

import { formatDistanceToNow } from "date-fns";
import useInterval from "../hooks/useInterval";
import { useState } from "react";

export function DistanceToNowStrict({ date }: { date: Date }) {
  const [state, setState] = useState<Record<string, never> | undefined>();

  useInterval(() => {
    setState({});
  }, 1000);

  return state
    ? formatDistanceToNow(date, { addSuffix: true })
    : date.toISOString();
}
