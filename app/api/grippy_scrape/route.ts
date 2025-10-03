import { ObjectId } from "mongodb";
import { auth } from "../../../auth";
import { isGrippyAuthTokens } from "../../../lib";
import { Users } from "../../../models/user.server";
import { Grippy, GrippyWorkoutLogs } from "../../../sources/grippy";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.Grippy,
      async function* ({ config: { authTokens }, ...source }, setUpdated) {
        setUpdated(false);

        let headers: HeadersInit = {
          authorization: `Bearer ${authTokens.access_token}`,
        };
        yield { authTokens };

        yield "refreshing token";

        const body = new FormData();
        body.append("grant_type", "refresh_token");
        body.append("refresh_token", authTokens.refresh_token);

        const authSigninRefreshTokenResponse = await (
          await fetch("https://api.griptonite.io/auth/token", {
            method: "POST",
            headers: {
              "Accept-Encoding": "gzip",
              authorization:
                "Basic RkVLdm9xSkJTTW44RE41cmZYaEtyQmgyMnMyNUh4cFIzajNiMk95bDo2d3h0S1BlNEZrZlFhQVVUaVc4QVBwQjZKSmk3c1JjSk5PT1RkekZLVGhCeGpxNkFyaGJsTmVqd0hzdnZHWWxpNDVLemtMQmdzdmxNSUZIbFE0VHBuZUhvQkI0cWZTbHR2RUtxdGpvRUFPRmhKczhzc1VrM1lqZkRZcGppVzlqZQ==",
              "User-Agent": "okhttp/4.9.2",
              Host: "api.griptonite.io",
            },
            body,
          })
        ).text();

        const authSigninRefreshTokenResponseJSON = JSON.parse(
          authSigninRefreshTokenResponse,
        ) as unknown;

        if (isGrippyAuthTokens(authSigninRefreshTokenResponseJSON)) {
          authTokens = authSigninRefreshTokenResponseJSON;
          await Users.updateOne(
            { _id: new ObjectId(user.id) },
            {
              $set: { "dataSources.$[source].config.authTokens": authTokens },
            },
            { arrayFilters: [{ "source.id": source.id }] },
          );
          yield "Updated authTokens with refresh token";
          yield { authTokens };
        } else {
          try {
            yield JSON.parse(authSigninRefreshTokenResponse);
          } catch {
            yield authSigninRefreshTokenResponse;
          }

          setUpdated(false);
          throw new Error("Failed to refresh token");
        }

        headers = { authorization: `Bearer ${authTokens.access_token}` };

        const response = await fetch(
          "https://api.griptonite.io/workouts/logs",
          { headers },
        );

        if (!response.ok || response.status !== 200) {
          setUpdated(false);
          throw new Error(await response.text());
        }

        const json = (await response.json()) as Grippy.WorkoutLogsResponse;

        const workoutLogs = json.data;

        for (const workoutLog of workoutLogs) {
          const updateResult = await GrippyWorkoutLogs.updateOne(
            { uuid: workoutLog.uuid },
            {
              $set: {
                ...workoutLog,
                start_time: new Date(workoutLog.start_time),
                end_time: new Date(workoutLog.end_time),
                _io_userId: user.id,
              },
            },
            { upsert: true },
          );

          setUpdated(updateResult);
        }

        yield { workoutLogs };
      },
    );
  });
