import { useEffect, useEffectEvent } from "react";

type Callback<A> = (...args: A[]) => void | Promise<void>;
export default function useInterval<A = unknown>(
  callback: Callback<A>,
  delay?: number | null,
  /** Whether to immediately invoke the callback before starting the interval (given a delay) */
  initialize?: boolean,
) {
  const savedCallback = useEffectEvent(callback);

  useEffect(() => {
    function tick() {
      void savedCallback?.();
    }
    if (delay !== null && delay !== undefined) {
      if (initialize) tick();

      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay, initialize]);
}
