"use client";
import * as Ably from "ably";
import { AblyProvider, ChannelProvider } from "ably/react";

// Create your Ably Realtime client
const realtimeClient = new Ably.Realtime({
  key: "qb4STQ.ARokgg:e0n62NscHz8TTXG9PaGb26OWks0IBp-LSKIxh7LmxFw",
});

export default function AblyWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  if (typeof window === "undefined") {
    return <>{children}</>;
  }

  return (
    <AblyProvider client={realtimeClient}>
      <ChannelProvider channelName="GraphQL:65a85e2c9a437530d3de2e35">
        {children}
      </ChannelProvider>
    </AblyProvider>
  );
}
