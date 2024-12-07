"use client";
import { useRouter } from "next/navigation";
import useInterval from "../../hooks/useInterval";
import { MINUTE_IN_SECONDS } from "../../utils";

export function DiaryPoller({
  userId,
  loadedAt,
  mostRecentlyScrapedAtAction,
}: {
  userId: string;
  loadedAt: Date;
  mostRecentlyScrapedAtAction: (userId: string) => Promise<Date>;
}) {
  const router = useRouter();

  useInterval(async () => {
    const scrapedAt = await mostRecentlyScrapedAtAction(userId);
    const loadedAtDate = new Date(loadedAt);

    console.log({ scrapedAt, loadedAtDate });
    if (scrapedAt > loadedAtDate) {
      console.info(
        `Refreshing diary because scrapedAt ${scrapedAt.toLocaleString()} > loadedAt ${loadedAtDate.toLocaleString()}`,
      );
      router.refresh();
    }
  }, 10000);

  useInterval(
    async () => {
      await fetch("/api/cron"); // Throwaway request to trigger a random scraper
      router.refresh();
    },
    MINUTE_IN_SECONDS * 1000 * 10,
  );

  return null;
}
