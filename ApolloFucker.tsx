import { useApolloClient } from "@apollo/client/react";
import { useEffect } from "react";

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
  return null;
}
