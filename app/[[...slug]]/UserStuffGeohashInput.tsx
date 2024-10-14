"use client";

import { useState } from "react";
import { encodeGeohash } from "../../utils";

export function UserStuffGeohashInput(props: { geohash?: string | null }) {
  const [geohash, setGeohash] = useState<string | null>(props.geohash ?? null);
  const [isGettingCurrentPosition, setIsGettingCurrentPosition] =
    useState<boolean>(false);

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
