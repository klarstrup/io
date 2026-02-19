import { addDays, subDays } from "date-fns";
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

// Could probably be derived from the request object but who cares
const uri =
  process.env.NODE_ENV === "development"
    ? "http://localhost:1337/api/withings_scrape"
    : "https://io.klarstrup.dk/api/withings_scrape";

const inState = "lolself";

export const maxDuration = 300;

const clientId = process.env.WITHINGS_CLIENT_ID!;
const clientSecret = process.env.WITHINGS_CLIENT_SECRET!;

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
            },
          },
        },
        { arrayFilters: [{ "source.id": userWithingsSources!.id }] },
      );

      return new NextResponse("Access token obtained and saved");
    }
  }

  return jsonStreamResponse(async function* () {
    yield* wrapSources(
      user,
      DataSource.Withings,
      async function* (
        {
          config: {
            accessTokenResponse,
            backfilledSleepSummaries,
            backfilledMeasureGroups,
          },
        },
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
                },
              },
            },
            { arrayFilters: [{ "source.id": userWithingsSources!.id }] },
          );

          accessTokenResponse = refreshTokenResponse;
        } else {
          await Users.updateOne(
            { _id: new ObjectId(user!.id) },
            {
              $set: {
                "dataSources.$[source].config.accessTokenResponse": null,
              },
            },
            { arrayFilters: [{ "source.id": userWithingsSources!.id }] },
          );

          throw new Error(
            "Failed to refresh access token, clearing existing token",
          );
        }

        let getMeasureGroupsOffset = 0;
        for (let i = 0; ; i++) {
          const measUrl = new URL("https://wbsapi.withings.net/measure");

          measUrl.searchParams.append("action", "getmeas");
          measUrl.searchParams.append(
            "startdate",
            (~~(
              (backfilledMeasureGroups
                ? subDays(new Date(), 21)
                : new Date(2018, 0, 1)
              ).getTime() / 1000
            )).toString(),
          );
          measUrl.searchParams.append(
            "enddate",
            (~~(addDays(new Date(), 1).getTime() / 1000)).toString(),
          );
          measUrl.searchParams.append("offset", String(getMeasureGroupsOffset));

          yield `Fetching measure groups ${measUrl}`;

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
              { grpid: measureGroup.grpid },
              {
                $set: {
                  ...measureGroup,
                  measuredAt: new Date(measureGroup.date * 1000),
                  createdAt: new Date(measureGroup.created * 1000),
                  modifiedAt: new Date(measureGroup.modified * 1000),
                  _withings_userId: Number(accessTokenResponse.userid),
                  _io_userId: user.id,
                },
              },
              { upsert: true },
            );

            setUpdated(updateResult);
          }
          yield `Fetched and upserted ${measureResponse.body.measuregrps.length} measure groups`;

          if (!backfilledMeasureGroups) {
            if (measureResponse.body.more) {
              getMeasureGroupsOffset += measureResponse.body.measuregrps.length;
            } else if (getMeasureGroupsOffset > 0) {
              await Users.updateOne(
                { _id: new ObjectId(user!.id) },
                {
                  $set: {
                    "dataSources.$[source].config.backfilledMeasureGroups": true,
                  },
                },
                { arrayFilters: [{ "source.id": userWithingsSources!.id }] },
              );

              break;
            }
          } else {
            break;
          }
        }

        let getSleepSummaryOffset = 0;
        for (let i = 0; ; i++) {
          const sleepUrl = new URL("https://wbsapi.withings.net/v2/sleep");
          sleepUrl.searchParams.append("action", "getsummary");
          sleepUrl.searchParams.append(
            "startdateymd",

            backfilledSleepSummaries
              ? subDays(new Date(), 21).toISOString().split("T")[0]!
              : "2018-01-01",
          );
          sleepUrl.searchParams.append(
            "enddateymd",
            addDays(new Date(), 1).toISOString().split("T")[0]!,
          );
          sleepUrl.searchParams.append("offset", String(getSleepSummaryOffset));

          yield `Fetching sleep summary ${sleepUrl}`;

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
              { id: sleepSeries.id },
              {
                $set: {
                  ...sleepSeries,
                  startedAt: new Date(sleepSeries.startdate * 1000),
                  endedAt: new Date(sleepSeries.enddate * 1000),
                  createdAt: new Date(sleepSeries.created * 1000),
                  modifiedAt: new Date(sleepSeries.modified * 1000),
                  // Sometimes the token response has this as a string, sometimes as a number, so we convert it to a number here to be safe
                  _withings_userId: Number(accessTokenResponse.userid),
                  _io_userId: user.id,
                },
              },
              { upsert: true },
            );

            setUpdated(updateResult);
          }

          yield `Fetched and upserted ${sleepSummaryResponse.body.series.length} sleep summary series`;

          if (!backfilledSleepSummaries) {
            if (sleepSummaryResponse.body.more) {
              getSleepSummaryOffset += sleepSummaryResponse.body.series.length;
            } else if (getSleepSummaryOffset > 0) {
              await Users.updateOne(
                { _id: new ObjectId(user!.id) },
                {
                  $set: {
                    "dataSources.$[source].config.backfilledSleepSummaries": true,
                  },
                },
                { arrayFilters: [{ "source.id": userWithingsSources!.id }] },
              );

              break;
            }
          } else {
            break;
          }
        }
      },
    );
  });
};
