import { useApolloClient } from "@apollo/client/react";
import { useEffect } from "react";

export default function ApolloFucker() {
  const client = useApolloClient();

  useEffect(() => {
    const cache = client.cache;
    // Refetch things after restoring from persisted cache
    if (typeof window !== "undefined") {
      // If there's anything in the cache this soon as the client is created,
      if (Object.keys(cache.extract() as Record<string, unknown>).length > 0) {
        client.refetchObservableQueries().catch(() => {
          // don't care
        });
      }
    }
  }, [client]);
  return null;
}
