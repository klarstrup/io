"use client";
import { useApolloClient } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import usePartySocket from "partysocket/react";
import useInterval from "../../hooks/useInterval";
import { MINUTE_IN_SECONDS } from "../../utils";

export function DiaryPoller({
  userId,
  loadedAt,
}: {
  userId: string;
  loadedAt: Date;
}) {
  const client = useApolloClient();
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
