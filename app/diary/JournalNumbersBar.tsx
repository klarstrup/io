"use client";

import { useQuery } from "@apollo/client/react";
import gql from "graphql-tag";
import { GetLatestWeightEntryDocument } from "../../graphql.generated";
import useTrendingNumber from "../../hooks/useTrendingNumber";

gql`
  query GetLatestWeightEntry {
    user {
      id
      weight
      weightTimeSeries {
        timestamp
        value
      }
      sleepDebtFraction
      sleepDebtFractionTimeSeries {
        timestamp
        value
      }
    }
  }
`;

function BarNumberContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[yellow]/25 bg-white/50 py-0.5 pr-1.5 pl-2 ${className}`}
      style={{
        boxShadow:
          "inset 0 0 8px rgba(0, 0, 0, 0.25), inset 0 0 4px #edab00, inset 0 0 4px #edab00, inset 0 0 1px rgba(0, 0, 0, 1), inset 0 0 0.5px rgba(0, 0, 0, 1)",
      }}
    >
      {children}
    </div>
  );
}

export default function JournalNumbersBar() {
  const { data } = useQuery(GetLatestWeightEntryDocument);

  const { value: sleepDebt, slope: sleepDebtSlope } = useTrendingNumber(
    data?.user?.sleepDebtFractionTimeSeries || [],
  );

  const { value: weight, slope: weightSlope } = useTrendingNumber(
    data?.user?.weightTimeSeries || [],
  );

  return (
    <div
      className="fixed left-1/2 z-50 flex -translate-x-1/2 transform items-center gap-1 overflow-hidden border border-[yellow]/25 bg-white/10 px-1 py-1 backdrop-blur-md sm:gap-2 pointer-coarse:top-0 pointer-coarse:rounded-b-2xl pointer-fine:bottom-0 pointer-fine:rounded-t-2xl"
      style={{
        boxShadow:
          "0 0 48px rgba(0, 0, 0, 0.5), 0 0 24px #edab00, 0 0 24px #edab00, 0 0 6px rgba(0, 0, 0, 1), 0 0 1px rgba(0, 0, 0, 1)",
      }}
    >
      <div className="flex items-center">
        <span className="px-1 text-shadow-md">💤</span>
        <BarNumberContainer className="flex items-baseline gap-px font-bold whitespace-nowrap tabular-nums">
          {data?.user?.sleepDebtFractionTimeSeries
            ? (sleepDebt * 100).toLocaleString(undefined, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })
            : "N/A"}
          <span
            className={
              "text-[10px] " +
              // positive slope means sleep debt is increasing, negative means it's decreasing
              (sleepDebtSlope > 0
                ? "text-green-500"
                : sleepDebtSlope < 0
                  ? "text-red-500"
                  : "text-gray-500")
            }
          >
            %
          </span>
        </BarNumberContainer>
      </div>
      <div className="h-8 w-1 rounded-full bg-[yellow]/25" />
      <div className="flex items-center">
        <span className="px-1 text-shadow-md">⚖️</span>
        <BarNumberContainer className="flex items-baseline gap-px font-bold whitespace-nowrap tabular-nums">
          {weight
            ? weight.toLocaleString(undefined, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })
            : "N/A"}
          <span
            className={
              "text-[10px] " +
              // positive slope means weight is increasing, negative means it's decreasing
              (weightSlope > 0
                ? "text-red-500"
                : weightSlope < 0
                  ? "text-green-500"
                  : "text-gray-500")
            }
          >
            kg
          </span>
        </BarNumberContainer>
      </div>
    </div>
  );
}
