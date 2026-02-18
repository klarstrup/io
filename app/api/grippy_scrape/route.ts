import { ObjectId } from "mongodb";
import { connection } from "next/server";
import { auth } from "../../../auth";
import { isGrippyAuthTokens } from "../../../lib";
import { Users } from "../../../models/user.server";
import {
  Grippy,
  GrippyWorkoutDetails,
  GrippyWorkoutLogDetails,
  GrippyWorkoutLogs,
} from "../../../sources/grippy";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { fetchText, jsonStreamResponse } from "../scraper-utils";

export const maxDuration = 45;

async function fetchGrippyWorkoutLogsByPage(
  page: number,
  authTokens: Grippy.AuthTokens,
): Promise<Grippy.WorkoutLogsResponse> {
  const res = await fetch(
    "https://api.griptonite.io/workouts/logs?page=" + page,
    { headers: { authorization: `Bearer ${authTokens.access_token}` } },
  );
  if (!res.ok || res.status !== 200) {
    throw new Error("Failed to fetch workout logs: " + res.statusText);
  }
  return await res.json();
}

async function fetchGrippyWorkoutLogDetailsByUuid(
  uuid: string,
  authTokens: Grippy.AuthTokens,
): Promise<Grippy.WorkoutLogDetails> {
  const res = await fetch("https://api.griptonite.io/workouts/logs/" + uuid, {
    headers: { authorization: `Bearer ${authTokens.access_token}` },
  });
  if (!res.ok || res.status !== 200) {
    throw new Error("Failed to fetch workout log details: " + res.statusText);
  }
  return await res.json();
}

async function fetchGrippyWorkoutDetailsByUuid(
  uuid: string,
  authTokens: Grippy.AuthTokens,
): Promise<Grippy.WorkoutDetails> {
  const res = await fetch("https://api.griptonite.io/workouts/" + uuid, {
    headers: { authorization: `Bearer ${authTokens.access_token}` },
  });
  if (!res.ok || res.status !== 200) {
    throw new Error("Failed to fetch workout details: " + res.statusText);
  }
  return await res.json();
}

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* () {
    await connection();

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

        const authSigninRefreshTokenResponse = await fetchText(
          "https://api.griptonite.io/auth/token",
          {
            method: "POST",
            headers: {
              "Accept-Encoding": "gzip",
              authorization:
                "Basic RkVLdm9xSkJTTW44RE41cmZYaEtyQmgyMnMyNUh4cFIzajNiMk95bDo2d3h0S1BlNEZrZlFhQVVUaVc4QVBwQjZKSmk3c1JjSk5PT1RkekZLVGhCeGpxNkFyaGJsTmVqd0hzdnZHWWxpNDVLemtMQmdzdmxNSUZIbFE0VHBuZUhvQkI0cWZTbHR2RUtxdGpvRUFPRmhKczhzc1VrM1lqZkRZcGppVzlqZQ==",
              "User-Agent": "okhttp/4.9.2",
              Host: "api.griptonite.io",
            },
            body,
          },
        );

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

        let insertedOrUpdatedLogs: Set<string> = new Set();
        let workoutIds: Set<string> = new Set();

        for (let page = 1; ; page++) {
          const {
            data: workoutLogs,
            metadata: { count, next },
          } = await fetchGrippyWorkoutLogsByPage(page, authTokens);

          yield [
            "Fetched workout logs",
            workoutLogs.length,
            "on page ",
            page,
            "of",
            Math.ceil(count / workoutLogs.length),
          ].join(" ");

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

            if (
              updateResult.upsertedCount > 0 ||
              updateResult.modifiedCount > 0 ||
              (await GrippyWorkoutLogDetails.countDocuments({
                uuid: workoutLog.uuid,
              })) === 0
            ) {
              insertedOrUpdatedLogs.add(workoutLog.uuid);
            }
            workoutIds.add(workoutLog.workout.uuid);
          }

          if (
            next &&
            (await GrippyWorkoutLogDetails.countDocuments({
              _io_userId: user.id,
            })) < count
          ) {
            continue;
          } else {
            yield "No more workout log pages to fetch or all logs are already fetched";
            break;
          }
        }
        yield {
          insertedOrUpdatedLogs: Array.from(insertedOrUpdatedLogs),
          workoutIds: Array.from(workoutIds),
        };

        // Fetch workout details for any new workouts
        for (const workoutId of workoutIds) {
          const workoutDetailResponse = await fetchGrippyWorkoutDetailsByUuid(
            workoutId,
            authTokens,
          );

          await GrippyWorkoutDetails.updateOne(
            { uuid: workoutDetailResponse.uuid },
            {
              $set: {
                ...workoutDetailResponse,
                _io_userId: user.id,

                creation_time: new Date(workoutDetailResponse.creation_time),
                update_time: new Date(workoutDetailResponse.update_time),
                versions: workoutDetailResponse.versions.map((version) => ({
                  ...version,
                  creation_time: new Date(version.creation_time),
                })),
              },
            },
            { upsert: true },
          );
        }

        // Fetch details for new or updated workout logs
        for (const uuid of insertedOrUpdatedLogs) {
          yield `Fetching details for workout log ${uuid}`;

          const detailResponse = await fetchGrippyWorkoutLogDetailsByUuid(
            uuid,
            authTokens,
          );

          await GrippyWorkoutLogDetails.updateOne(
            { uuid: detailResponse.uuid },
            {
              $set: {
                ...detailResponse,
                start_time: new Date(detailResponse.start_time),
                end_time: new Date(detailResponse.end_time),
                sets: detailResponse.sets.map((set) => ({
                  ...set,
                  start_time: set.start_time && new Date(set.start_time),
                  end_time: set.end_time && new Date(set.end_time),
                  reps: set.reps.map((rep) => ({
                    ...rep,
                    start_time: rep.start_time && new Date(rep.start_time),
                    end_time: rep.end_time && new Date(rep.end_time),
                  })),
                })),
                time_log: detailResponse.time_log.map((entry) => ({
                  ...entry,
                  start_time: entry.start_time && new Date(entry.start_time),
                  end_time: entry.end_time && new Date(entry.end_time),
                })),
                _io_userId: user.id,
              },
            },
            { upsert: true },
          );
        }
      },
    );
  });
