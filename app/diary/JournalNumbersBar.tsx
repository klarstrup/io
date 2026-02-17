"use client";

import { useQuery } from "@apollo/client/react";
import gql from "graphql-tag";
import { GetLatestWeightEntryQuery } from "../../graphql.generated";

export default function JournalNumbersBar() {
  const { data } = useQuery<GetLatestWeightEntryQuery>(gql`
    query GetLatestWeightEntry {
      user {
        weight
      }
    }
  `);

  return (
    <div
      className="fixed left-1/2 z-50 flex -translate-x-1/2 transform items-center gap-1 rounded-2xl border border-[yellow]/25 bg-white/10 px-2 py-1 backdrop-blur-md sm:gap-2 pointer-coarse:top-2 pointer-fine:bottom-4"
      style={{
        boxShadow:
          "0 0 48px rgba(0, 0, 0, 0.5), 0 0 24px #edab00, 0 0 24px #edab00, 0 0 6px rgba(0, 0, 0, 1), 0 0 1px rgba(0, 0, 0, 1)",
      }}
    >
      <span className="font-bold">
        ⚖️{" "}
        {data?.user?.weight ? (
          <>
            {data.user.weight.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            <small>kg</small>
          </>
        ) : (
          "N/A"
        )}
      </span>
    </div>
  );
}
