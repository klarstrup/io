"use client";
import * as Ably from "ably";
import { AblyProvider, ChannelProvider } from "ably/react";
import { useSession } from "next-auth/react";

// Create your Ably Realtime client
const realtimeClient =
  typeof window === "undefined"
    ? null
    : new Ably.Realtime({
        key: "qb4STQ.ARokgg:e0n62NscHz8TTXG9PaGb26OWks0IBp-LSKIxh7LmxFw",
      });

export default function AblyWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const user = session?.user;
  if (!user) return <>{children}</>;
  if (!realtimeClient) return <>{children}</>;

  return (
    <AblyProvider client={realtimeClient}>
      <ChannelProvider channelName={`GraphQL:${user.id}`}>
        {children}
      </ChannelProvider>
    </AblyProvider>
  );
}
