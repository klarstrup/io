import { useApolloClient } from "@apollo/client/react";
import { useEffect, useRef } from "react";
import { usePageVisibility } from "./hooks";

export default function ApolloFucker() {
  const client = useApolloClient();
  useEffect(() => {
    const cache = client.cache;
    // Refetch things after restoring from persisted cache
    if (typeof window !== "undefined") {
      setTimeout(() => {
        // If there's anything in the cache this soon as the client is created,
        // @ts-expect-error - failed to monkey patch this in the types
        if (cache._io_wasRestoredFromLocalStorage) {
          requestIdleCallback(() => {
            client.refetchObservableQueries().catch(() => {
              // don't care
            });
          });
        }
      }, 1000);
    }
  }, [client]);

  const isPageVisible = usePageVisibility();

  const visibilityRef = useRef(isPageVisible);
  const lastVisibilityFetchRef = useRef(
    // eslint-disable-next-line react-hooks/purity
    typeof window !== "undefined" ? Date.now() : 0,
  );
  useEffect(() => {
    if (!visibilityRef.current && isPageVisible) {
      const now = Date.now();
      // Don't refetch if we've done so in the last 5 minutes, to avoid refetching when the user is switching tabs quickly
      if (now - lastVisibilityFetchRef.current < 300000) return;

      lastVisibilityFetchRef.current = now;
      console.log("Page became visible, refetching active queries");
      void client.refetchQueries({ include: "active" });
    }

    visibilityRef.current = isPageVisible;
  }, [client, isPageVisible]);

  return null;
}
