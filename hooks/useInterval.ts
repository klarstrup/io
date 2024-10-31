import { useEffect, useRef } from "react";

type Callback<A> = (...args: A[]) => void;
export default function useInterval<A = unknown>(
  callback: Callback<A>,
  delay?: number | null,
  ...args: A[]
) {
  const savedCallback = useRef<Callback<A>>(() => {});

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current?.(...args);
    }
    if (delay !== null && delay !== undefined) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);
}
