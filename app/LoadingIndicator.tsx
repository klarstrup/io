"use client";

import { useApolloNetworkStatus } from "../ApolloWrapper";

export default function LoadingIndicator() {
  const networkStatus = useApolloNetworkStatus();

  // Don't return early because I want the div to be animating continuously,
  // so it doesn't jump back to 0 rotation when the network status changes.
  // Instead, conditionally render the hourglass inside the div.

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-200 flex items-center justify-center p-4">
      <span className="animate-spin text-4xl">
        {networkStatus.numPendingQueries === 0 &&
        networkStatus.numPendingMutations === 0
          ? null
          : "⏳"}
      </span>
    </div>
  );
}
