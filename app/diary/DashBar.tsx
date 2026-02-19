"use client";

import { useQuery } from "@apollo/client/react";
import gql from "graphql-tag";
import { DistanceToNowStrict } from "../../components/DistanceToNowStrict";
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
      availableBalance
      sunnivaAt
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

function BarIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative px-1">
      <span
        className="absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2"
        style={{
          filter: "invert(1) blur(2px)",
        }}
      >
        {children}
      </span>
      <span
        className="absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2"
        style={{
          filter: "invert(1) blur(4px)",
        }}
      >
        {children}
      </span>
      {children}
    </div>
  );
}

export default function DashBar() {
  const { data } = useQuery(GetLatestWeightEntryDocument);

  const { value: sleepDebt, slope: sleepDebtSlope } = useTrendingNumber(
    data?.user?.sleepDebtFractionTimeSeries || [],
  );

  const { value: weight, slope: weightSlope } = useTrendingNumber(
    data?.user?.weightTimeSeries || [],
  );

  const availableBalance = data?.user?.availableBalance;

  return (
    <div
      className="fixed left-1/2 z-50 flex -translate-x-1/2 transform items-center gap-1 overflow-hidden border border-[yellow]/25 bg-white/10 px-1 py-1 backdrop-blur-md sm:gap-2 pointer-coarse:top-0 pointer-coarse:rounded-b-2xl pointer-fine:bottom-0 pointer-fine:rounded-t-2xl"
      style={{
        boxShadow:
          "0 0 48px rgba(0, 0, 0, 0.5), 0 0 24px #edab00, 0 0 24px #edab00, 0 0 6px rgba(0, 0, 0, 1), 0 0 1px rgba(0, 0, 0, 1)",
      }}
    >
      {data?.user?.sleepDebtFractionTimeSeries ? (
        <div className="flex items-center">
          <BarIcon>💤</BarIcon>
          <BarNumberContainer className="flex items-baseline gap-px font-bold whitespace-nowrap tabular-nums">
            {(sleepDebt * 100).toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
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
      ) : null}
      <div className="h-7 w-[0.5px] rounded-full bg-[yellow]" />
      {/*
      {data?.user?.weightTimeSeries ? (
        <div className="flex items-center">
          <BarIcon>⚖️</BarIcon>
          <BarNumberContainer className="flex items-baseline gap-px font-bold whitespace-nowrap tabular-nums">
            {weight.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
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
      ) : null}
       */}
      <div className="h-7 w-[0.5px] rounded-full bg-[yellow]" />
      {availableBalance ? (
        <div className="flex items-center">
          <BarIcon>💰</BarIcon>
          <BarNumberContainer className="flex items-baseline gap-px font-bold whitespace-nowrap tabular-nums">
            {availableBalance.toLocaleString("da", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
            <span className={"text-[10px]"}>,-</span>
          </BarNumberContainer>
        </div>
      ) : null}

      {data?.user?.sunnivaAt ? (
        <>
          <div className="h-7 w-[0.5px] rounded-full bg-[yellow]" />
          <div className="flex items-center">
            <BarIcon>👊</BarIcon>
            <BarNumberContainer className="flex items-baseline gap-px font-bold whitespace-nowrap tabular-nums">
              <DistanceToNowStrict date={new Date(data.user.sunnivaAt)} />
            </BarNumberContainer>
          </div>
        </>
      ) : null}
    </div>
  );
}
