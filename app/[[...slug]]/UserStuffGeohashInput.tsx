"use client";

import { useState } from "react";
import useInterval from "../../hooks/useInterval";
import { encodeGeohash, HOUR_IN_SECONDS } from "../../utils";
import { revalidateDiary } from "../diary/[[...date]]/actions";

export function UserStuffGeohashInput(props: { geohash?: string | null }) {
  const [geohash, setGeohash] = useState<string | null>(props.geohash ?? null);
  const [isGettingCurrentPosition, setIsGettingCurrentPosition] =
    useState<boolean>(false);

  useInterval(
    () => {
      void revalidateDiary();
    },
    (HOUR_IN_SECONDS * 1000) / 2,
  );

  return (
    <div
      style={{
        display: "flex",
      }}
    >
      <input
        type="text"
        placeholder="Geohash"
        name="geohash"
        value={geohash || ""}
        readOnly
        disabled={isGettingCurrentPosition}
        className="border-b-2 border-gray-200 focus:border-gray-500"
      />
      <button
        disabled={isGettingCurrentPosition}
        onClick={() => {
          setIsGettingCurrentPosition(true);
          try {
            navigator.geolocation.getCurrentPosition(({ coords }) => {
              setIsGettingCurrentPosition(false);
              setGeohash(encodeGeohash(coords.latitude, coords.longitude, 6));
            });
          } catch (err) {
            setIsGettingCurrentPosition(false);
            console.error(err);
          }
        }}
      >
        🌍
      </button>
    </div>
  );
}
