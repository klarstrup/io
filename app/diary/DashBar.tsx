"use client";

import { useQuery } from "@apollo/client/react";
import { TZDate } from "@date-fns/tz";
import { addDays, isFuture } from "date-fns";
import gql from "graphql-tag";
import { useSession } from "next-auth/react";
import { twMerge } from "tailwind-merge";
import { DistanceToNowShort } from "../../components/DistanceToNowStrict";
import { GetLatestWeightEntryDocument } from "../../graphql.generated";
import useTrendingNumber from "../../hooks/useTrendingNumber";
import { DataSource } from "../../sources/utils";
import {
  decodeGeohash,
  DEFAULT_TIMEZONE,
  getSunrise,
  getSunset,
} from "../../utils";

gql`
  query GetLatestWeightEntry {
    user {
      id
      weight
      weightTimeSeries {
        timestamp
        value
      }
      pastBusynessFraction
      futureBusynessFraction
      sleepDebtFraction
      sleepDebtFractionTimeSeries {
        timestamp
        value
      }
      fatRatio
      fatRatioTimeSeries {
        timestamp
        value
      }
      availableBalance
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
      className={`flex items-baseline gap-px rounded-xl border border-[yellow]/25 bg-white/50 py-px pr-1.5 pl-1.5 leading-tight font-semibold -tracking-wider whitespace-nowrap tabular-nums ${className}`}
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
    <div className="relative">
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
  const { data: sessionData } = useSession();
  const { data } = useQuery(GetLatestWeightEntryDocument);

  const { value: sleepDebt, slope: sleepDebtSlope } = useTrendingNumber(
    data?.user?.sleepDebtFractionTimeSeries || [],
  );

  const { value: weight, slope: weightSlope } = useTrendingNumber(
    data?.user?.weightTimeSeries || [],
  );

  const availableBalance = data?.user?.availableBalance;
  const { value: fatRatio, slope: fatRatioSlope } = useTrendingNumber(
    data?.user?.fatRatioTimeSeries || [],
  );

  const timeZone = sessionData?.user?.timeZone || DEFAULT_TIMEZONE;
  const tzDate = TZDate.tz(timeZone);

  const userGeohash = sessionData?.user?.dataSources?.find(
    (source) => source.source === DataSource.Tomorrow,
  )?.config?.geohash;
  const userLocation = userGeohash ? decodeGeohash(userGeohash) : null;
  const sunrise =
    userLocation &&
    getSunrise(userLocation.latitude, userLocation.longitude, tzDate);
  const sunset =
    userLocation &&
    getSunset(userLocation.latitude, userLocation.longitude, tzDate);
  const sunriseTomorrow =
    userLocation &&
    getSunrise(
      userLocation.latitude,
      userLocation.longitude,
      addDays(tzDate, 1),
    );

  return (
    <div
      className={twMerge(
        "fixed left-1/2 z-50 -translate-x-1/2 transform pointer-coarse:top-0 pointer-coarse:rounded-b-2xl pointer-fine:bottom-0 pointer-fine:rounded-t-2xl",
        "border border-[yellow]/25 bg-white/10 select-none",
        "flex max-w-[calc(100%-0.5rem)] min-w-85 flex-wrap items-center justify-around gap-1 overflow-hidden px-1 py-1 backdrop-blur-md sm:gap-2",
      )}
      style={{
        boxShadow:
          "0 0 48px rgba(0, 0, 0, 0.5), 0 0 24px #edab00, 0 0 24px #edab00, 0 0 6px rgba(0, 0, 0, 1), 0 0 1px rgba(0, 0, 0, 1)",
      }}
    >
      {data?.user?.sleepDebtFractionTimeSeries ? (
        <div className="flex items-center gap-1">
          <BarIcon>💤</BarIcon>
          <BarNumberContainer>
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
      {data?.user?.pastBusynessFraction ||
      data?.user?.futureBusynessFraction ? (
        <div className="flex items-center gap-1">
          <BarIcon>⏳</BarIcon>
          <BarNumberContainer>
            {data.user.pastBusynessFraction &&
              (data.user.pastBusynessFraction * 100).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            <span className="text-[10px]">%</span>
            <div
              className="mx-1 h-5 w-[0.5px] self-center rounded-full bg-[yellow]"
              style={{
                boxShadow:
                  "0 0 8px rgba(0, 0, 0, 0.25), 0 0 4px #edab00, 0 0 4px #edab00, 0 0 1px rgba(0, 0, 0, 1), 0 0 0.5px rgba(0, 0, 0, 1)",
              }}
            />
            {data.user.futureBusynessFraction &&
              (data.user.futureBusynessFraction * 100).toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                },
              )}
            <span className="text-[10px]">%</span>
          </BarNumberContainer>
        </div>
      ) : null}
      {/*
      {data?.user?.weightTimeSeries ? (
        <div className="flex items-center gap-1">
          <BarIcon>⚖️</BarIcon>
          <BarNumberContainer>
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
      {data?.user?.fatRatioTimeSeries ? (
        <div className="flex items-center gap-1">
          <BarIcon>🤰</BarIcon>
          <BarNumberContainer>
            {fatRatio.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            <span
              className={
                "text-[10px] " +
                // positive slope means fat ratio is increasing, negative means it's decreasing
                (fatRatioSlope > 0
                  ? "text-red-500"
                  : fatRatioSlope < 0
                    ? "text-green-500"
                    : "text-gray-500")
              }
            >
              %
            </span>
          </BarNumberContainer>
        </div>
      ) : null}
       */}
      {availableBalance ? (
        <div className="flex items-center gap-1">
          <BarIcon>💰</BarIcon>
          <BarNumberContainer>
            {availableBalance.toLocaleString("da", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </BarNumberContainer>
        </div>
      ) : null}
      {sunrise && isFuture(sunrise) ? (
        <span className="flex items-center gap-1 whitespace-nowrap">
          <BarIcon>🌅</BarIcon>
          <BarNumberContainer>
            <DistanceToNowShort date={sunrise} />
          </BarNumberContainer>
        </span>
      ) : sunset && isFuture(sunset) ? (
        <span className="flex items-center gap-1 whitespace-nowrap">
          <BarIcon>🌇</BarIcon>
          <BarNumberContainer>
            <DistanceToNowShort date={sunset} />
          </BarNumberContainer>
        </span>
      ) : sunriseTomorrow ? (
        <span className="flex items-center gap-1 whitespace-nowrap">
          <BarIcon>🌅</BarIcon>
          <BarNumberContainer>
            <DistanceToNowShort date={sunriseTomorrow} />
          </BarNumberContainer>
        </span>
      ) : null}
    </div>
  );
}
