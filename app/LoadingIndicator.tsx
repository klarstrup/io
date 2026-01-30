"use client";

import { useApolloNetworkStatus } from "../ApolloWrapper";

export default function LoadingIndicator() {
  const networkStatus = useApolloNetworkStatus();
  if (
    networkStatus.numPendingQueries === 0 &&
    networkStatus.numPendingMutations === 0
  ) {
    return null;
  }
  return (
    <div className="fixed top-4 left-4 flex items-center justify-center p-4">
      <span className="animate-spin text-4xl">⏳</span>
    </div>
  );
}
