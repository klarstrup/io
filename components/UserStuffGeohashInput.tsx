"use client";
import { useState } from "react";
import { encodeGeohash } from "../utils";

export function UserStuffGeohashInput(props: {
  geohash: string | null;
  onGeohashChange: (geohash: string) => void;
}) {
  const [geohash, setGeohash] = useState<string | null>(props.geohash ?? null);
  const [isGettingCurrentPosition, setIsGettingCurrentPosition] =
    useState<boolean>(false);

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
              props.onGeohashChange(
                encodeGeohash(coords.latitude, coords.longitude, 6),
              );
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
