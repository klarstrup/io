import { useDeferredValue, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
const returnFalse = () => false;
const trueOnServerOrHydration = () => true;
/**
 * Hook to check if the component is being rendered on the server or during hydration (client side).
 * Helpful for avoiding avoiding hydration errors.
 * Explanation: https://kurtextrem.de/posts/react-uses-hydration */
export function useIsSSR() {
  const isSSRSync = useSyncExternalStore(
    emptySubscribe,
    returnFalse,
    trueOnServerOrHydration,
  );
  return useDeferredValue(isSSRSync);
}
