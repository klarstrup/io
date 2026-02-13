import { addDays } from "date-fns";
import { ObjectId } from "mongodb";
import { connection, NextRequest, NextResponse } from "next/server";
import { auth } from "../../../auth";
import { Users } from "../../../models/user.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { Withings } from "../../../sources/withings";
import {
  WithingsMeasureGroup,
  WithingsSleepSummarySeries,
} from "../../../sources/withings.server";
import { jsonStreamResponse } from "../scraper-utils";

const uri = "http://localhost:1337/api/withings_scrape";
const inState = "lolself";

export const maxDuration = 45;

const clientId = process.env.WITHINGS_CLIENT_ID!;
const clientSecret = process.env.WITHINGS_CLIENT_SECRET!;

const withingsMeasureTypes = [
  ["WEIGHT", 1, "Weight (kg)"],
  ["HEIGHT", 4, "Height (meter)"],
  ["FAT_FREE_MASS", 5, "Fat Free Mass (kg)"],
  ["FAT_RATIO", 6, "Fat Ratio (%)"],
  ["FAT_MASS", 8, "Fat Mass Weight (kg)"],
  ["DIASTSOLIC_BLOOD_PRESSURE", 9, "Diastolic Blood Pressure (mmHg)"],
  ["SYSTOLIC_BLOOD_PRESSURE", 10, "Systolic Blood Pressure (mmHg)"],
  ["HEART_PULE", 11, "Heart Pulse (bpm) - only for BPM and scale devices"],
  ["TEMPERATURE", 12, "Temperature (celsius)"],
  ["SPO2", 54, "SpO2 (%)"],
  ["BODY_TEMPERATURE", 71, "Body Temperature (celsius)"],
  ["SKIN_TEMPERATURE", 73, "Skin Temperature (celsius)"],
  ["MUSCLE_MASS", 76, "Muscle Mass (kg)"],
  ["HYDRATION", 77, "Hydration (kg)"],
  ["BONE_MASS", 88, "Bone Mass (kg)"],
  ["PULE_WAVE_VELOCITY", 91, "Pulse Wave Velocity (m/s)"],
] as const;

export const GET = async (req: NextRequest) => {
  if (!clientId || !clientSecret) {
    return new Response("Withings client ID or secret not set", {
      status: 500,
    });
  }

  await connection();

  const user = (await auth())?.user;
  if (!user) return new Response("Unauthorized", { status: 401 });

  const searchParams = req.nextUrl.searchParams;

  const userWithingsSources = (user.dataSources ?? []).find(
    (ds) => ds.source === DataSource.Withings,
  );

  if (!userWithingsSources) {
    return new Response("Withings data source not found for user", {
      status: 400,
    });
  }

  const code = searchParams.get("code");
  if (!userWithingsSources.config.accessTokenResponse?.access_token || code) {
    if (!code) {
      const redirectUrl = new URL(
        "https://account.withings.com/oauth2_user/authorize2",
      );

      redirectUrl.searchParams.append("response_type", "code");
      redirectUrl.searchParams.append("client_id", clientId);
      redirectUrl.searchParams.append("redirect_uri", uri);
      redirectUrl.searchParams.append("state", inState);
      redirectUrl.searchParams.append(
        "scope",
        "user.info,user.metrics,user.activity,user.sleepevents",
      );

      return NextResponse.redirect(redirectUrl.toString());
    }

    const body = new FormData();
    body.append("action", "requesttoken");
    body.append("grant_type", "authorization_code");
    body.append("client_id", clientId);
    body.append("client_secret", clientSecret);
    body.append("code", code);
    body.append("redirect_uri", uri);

    const { body: accessTokenResponse } = await (
      await fetch("https://wbsapi.withings.net/v2/oauth2", {
        method: "POST",
        body,
      })
    ).json();

    console.log("Withings access token response:", accessTokenResponse);

    if (accessTokenResponse.access_token) {
      await Users.updateOne(
        { _id: new ObjectId(user!.id) },
        {
          $set: {
            "dataSources.$[source].config.accessTokenResponse": {
              ...accessTokenResponse,
              expires_at: new Date(
                Date.now() + accessTokenResponse.expires_in * 1000,
              ),
            } as any,
          },
        },
        { arrayFilters: [{ "source.id": userWithingsSources!.id }] },
      );
    }
  }

  return jsonStreamResponse(async function* () {
    yield* wrapSources(
      user,
      DataSource.Withings,
      async function* (
        { config: { accessTokenResponse, userId } },
        setUpdated,
      ) {
        const refreshTokenUrl = new URL(
          "https://wbsapi.withings.net/v2/oauth2",
        );

        refreshTokenUrl.searchParams.append("action", "requesttoken");
        refreshTokenUrl.searchParams.append("grant_type", "refresh_token");
        refreshTokenUrl.searchParams.append("client_id", clientId);
        refreshTokenUrl.searchParams.append("client_secret", clientSecret);
        refreshTokenUrl.searchParams.append(
          "refresh_token",
          accessTokenResponse.refresh_token,
        );

        const { body: refreshTokenResponse } = await (
          await fetch(refreshTokenUrl, {
            method: "POST",
            headers: {
              authorization: `Bearer ${accessTokenResponse.access_token}`,
            },
          })
        ).json();

        if (refreshTokenResponse.access_token) {
          await Users.updateOne(
            { _id: new ObjectId(user!.id) },
            {
              $set: {
                "dataSources.$[source].config.accessTokenResponse": {
                  ...refreshTokenResponse,
                  expires_at: new Date(
                    Date.now() + refreshTokenResponse.expires_in * 1000,
                  ),
                } as any,
              },
            },
            { arrayFilters: [{ "source.id": userWithingsSources!.id }] },
          );

          accessTokenResponse = refreshTokenResponse;
        } else {
          throw new Error("Failed to refresh access token");
        }

        const measUrl = new URL("https://wbsapi.withings.net/measure");

        measUrl.searchParams.append("action", "getmeas");

        const measureResponse = (await (
          await fetch(measUrl, {
            method: "POST",
            headers: {
              authorization: `Bearer ${accessTokenResponse.access_token}`,
            },
          })
        ).json()) as Withings.MeasureResponse;

        for (const measureGroup of measureResponse.body.measuregrps) {
          const updateResult = await WithingsMeasureGroup.updateOne(
            { uuid: measureGroup.grpid },
            {
              $set: {
                ...measureGroup,
                measuredAt: new Date(measureGroup.date * 1000),
                createdAt: new Date(measureGroup.created * 1000),
                modifiedAt: new Date(measureGroup.modified * 1000),
                _withings_userId: userId,
                _io_userId: user.id,
              },
            },
            { upsert: true },
          );

          setUpdated(updateResult);
        }

        const sleepUrl = new URL("https://wbsapi.withings.net/v2/sleep");

        sleepUrl.searchParams.append("action", "getsummary");
        sleepUrl.searchParams.append("startdateymd", "2015-01-01");
        sleepUrl.searchParams.append(
          "enddateymd",
          addDays(new Date(), 1).toISOString().split("T")[0]!,
        );

        const sleepSummaryResponse = (await (
          await fetch(sleepUrl, {
            method: "POST",
            headers: {
              authorization: `Bearer ${accessTokenResponse.access_token}`,
            },
          })
        ).json()) as Withings.SleepSummaryResponse;

        for (const sleepSeries of sleepSummaryResponse.body.series) {
          const updateResult = await WithingsSleepSummarySeries.updateOne(
            { uuid: sleepSeries.id },
            {
              $set: {
                ...sleepSeries,
                startedAt: new Date(sleepSeries.startdate * 1000),
                endedAt: new Date(sleepSeries.enddate * 1000),
                createdAt: new Date(sleepSeries.created * 1000),
                modifiedAt: new Date(sleepSeries.modified * 1000),
                _withings_userId: userId,
                _io_userId: user.id,
              },
            },
            { upsert: true },
          );

          setUpdated(updateResult);
        }
      },
    );
  });
};
