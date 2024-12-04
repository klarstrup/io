"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useInterval from "../hooks/useInterval";
import { encodeGeohash, MINUTE_IN_SECONDS } from "../utils";

export function UserStuffGeohashInput(props: {
  geohash: string | null;
  onGeohashChange: (geohash: string) => void;
}) {
  const router = useRouter();
  const [geohash, setGeohash] = useState<string | null>(props.geohash ?? null);
  const [isGettingCurrentPosition, setIsGettingCurrentPosition] =
    useState<boolean>(false);

  useInterval(
    () => {
      router.refresh();

      void fetch("/api/cron").catch((error) => console.error(error)); // Throwaway request to trigger a random scraper
    },
    MINUTE_IN_SECONDS * 1000 * 10,
  );

  return (
    <>
      <input
        type="text"
        placeholder="Geohash"
        name="geohash"
        value={geohash || ""}
        readOnly
        disabled={isGettingCurrentPosition}
        className="w-full flex-1 border-b-2 border-gray-200 focus:border-gray-500"
      />
      <button
        disabled={isGettingCurrentPosition}
        onClick={() => {
          setIsGettingCurrentPosition(true);
          try {
            navigator.geolocation.getCurrentPosition(({ coords }) => {
              setIsGettingCurrentPosition(false);
              setGeohash(encodeGeohash(coords.latitude, coords.longitude, 6));
              props.onGeohashChange(encodeGeohash(coords.latitude, coords.longitude, 6));
            });
          } catch (err) {
            setIsGettingCurrentPosition(false);
            console.error(err);
          }
        }}
      >
        🌍
      </button>
    </>
  );
}
