"use client";

import { useQuery } from "@apollo/client/react";
import { TZDate } from "@date-fns/tz";
import { addDays, isFuture } from "date-fns";
import gql from "graphql-tag";
import { useSession } from "next-auth/react";
import { DistanceToNowShort } from "../../components/DistanceToNowStrict";
import { Masonry } from "../../components/Masonry";
import { GetLatestWeightEntryDocument } from "../../graphql.generated";
import useTrendingNumber from "../../hooks/useTrendingNumber";
import { DataSource } from "../../sources/utils";
import {
  decodeGeohash,
  DEFAULT_TIMEZONE,
  getSunrise,
  getSunset,
} from "../../utils";

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
      inboxEmailCount
      dataSources {
        source
        config
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
    <div className="relative px-1">
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          filter: "invert(1) blur(1.5px)",
        }}
      >
        {children}
      </span>
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          filter: "invert(1) blur(3px)",
        }}
      >
        {children}
      </span>
      <span className="relative">{children}</span>
    </div>
  );
}

export default function DashBar() {
  const { data: sessionData } = useSession();
  const { data } = useQuery(GetLatestWeightEntryDocument);

  console.log("DashBar data", data);

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

  const userWithingsId = sessionData?.user?.dataSources?.find(
    (source) => source.source === DataSource.Withings,
  )?.config?.accessTokenResponse.userid;

  return (
    <Masonry
      rows={2}
      className="gap-y-0.5 overflow-auto pr-0.5 select-none"
      rowProps={{ className: "gap-x-2" }}
    >
      {availableBalance ? (
        <a
          href="https://mine.spiir.dk/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex cursor-pointer! items-center"
        >
          <BarIcon>💰</BarIcon>
          <BarNumberContainer>
            {availableBalance.toLocaleString("da", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </BarNumberContainer>
        </a>
      ) : null}
      {data?.user?.sleepDebtFractionTimeSeries ? (
        <a
          href="https://healthmate.withings.com/9537172/sleep"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center"
        >
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
        </a>
      ) : null}
      {data?.user?.inboxEmailCount != undefined ? (
        <a
          href="https://mail.google.com/mail/u/0/#inbox"
          target="_blank"
          rel="noopener noreferrer"
          className="flex cursor-pointer! items-center"
          title={`${data.user.inboxEmailCount} emails in inbox`}
        >
          <BarIcon>📧</BarIcon>
          <BarNumberContainer
            className={
              data.user.inboxEmailCount === 0
                ? "border-green-500/50 bg-green-500/90 text-green-700"
                : data.user.inboxEmailCount > 100
                  ? "border-red-500/25 bg-red-500/50 text-red-700"
                  : ""
            }
          >
            {data.user.inboxEmailCount.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </BarNumberContainer>
        </a>
      ) : null}
      {data?.user?.pastBusynessFraction != undefined &&
      data?.user?.futureBusynessFraction != undefined ? (
        <a
          className="flex cursor-pointer! items-center"
          href={"https://calendar.google.com/calendar/u/0/r"}
          target="_blank"
          rel="noopener noreferrer"
          title={
            `Past busyness: ${(
              data.user.pastBusynessFraction * 100
            ).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}%\n` +
            `Future busyness: ${(
              data.user.futureBusynessFraction * 100
            ).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}%`
          }
        >
          <BarIcon>🐝</BarIcon>
          <BarNumberContainer>
            {(
              (data.user.futureBusynessFraction -
                data.user.pastBusynessFraction) *
              100
            ).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
            <span className="text-[10px]">%</span>
          </BarNumberContainer>
        </a>
      ) : null}
      {sunrise && isFuture(sunrise) ? (
        <span className="flex items-center whitespace-nowrap">
          <BarIcon>🌅</BarIcon>
          <BarNumberContainer>
            <DistanceToNowShort date={sunrise} />
          </BarNumberContainer>
        </span>
      ) : sunset && isFuture(sunset) ? (
        <span className="flex items-center whitespace-nowrap">
          <BarIcon>🌇</BarIcon>
          <BarNumberContainer>
            <DistanceToNowShort date={sunset} />
          </BarNumberContainer>
        </span>
      ) : sunriseTomorrow ? (
        <span className="flex items-center whitespace-nowrap">
          <BarIcon>🌅</BarIcon>
          <BarNumberContainer>
            <DistanceToNowShort date={sunriseTomorrow} />
          </BarNumberContainer>
        </span>
      ) : null}
      {data?.user?.weightTimeSeries ? (
        <a
          href={`https://healthmate.withings.com/${userWithingsId}/weight`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex cursor-pointer! items-center"
        >
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
        </a>
      ) : null}
      {data?.user?.fatRatioTimeSeries ? (
        <a
          href={`https://healthmate.withings.com/${userWithingsId}/weight`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex cursor-pointer! items-center"
        >
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
        </a>
      ) : null}
    </Masonry>
  );
}
