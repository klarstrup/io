"use client";
import { useApolloClient } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import usePartySocket from "partysocket/react";
import { useId } from "react";
import useInterval from "../../hooks/useInterval";
import { MINUTE_IN_SECONDS } from "../../utils";

export function DiaryPoller({
  userId,
  loadedAt,
}: {
  userId: string;
  loadedAt: Date;
}) {
  const id = useId();
  const client = useApolloClient();

  if (process.env.NODE_ENV === "development") {
    usePartySocket({
      host: "ws://localhost:3000/_next/webpack-hmr?id=" + id,
      room: "diary-poller-" + id,
      onMessage(event) {
        const data = JSON.parse(event.data as string);

        if ("type" in data && data.type === "built") {
          // A webpack rebuild happened, likely due to code changes
          // TODO: Make this smarter to avoid unnecessary refreshes
          console.log(
            "[DiaryPoller] Webpack rebuild detected, refetching queries",
          );
          client.refetchObservableQueries();
        }
      },
    });
  }

  usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
    room: userId,
    onMessage(event) {
      console.log(event);
      try {
        const data = JSON.parse(event.data as string) as unknown;
        console.log(data);

        const loadedAtDate = new Date(loadedAt);

        if (
          data &&
          typeof data === "object" &&
          "scrapedAt" in data &&
          typeof data.scrapedAt === "number" &&
          new Date(data.scrapedAt) > loadedAtDate
        ) {
          console.info(
            `Refreshing diary because scrapedAt ${new Date(data.scrapedAt).toLocaleString()} > loadedAt ${loadedAtDate.toLocaleString()}`,
          );
          router.refresh();
          client.refetchObservableQueries();
        }
      } catch (error) {
        console.error(error);
      }
    },
  });

  const router = useRouter();

  useInterval(
    async () => {
      await fetch("/api/cron"); // Throwaway request to trigger a random scraper
      router.refresh();
    },
    MINUTE_IN_SECONDS * 1000 * 10,
  );

  return null;
}
