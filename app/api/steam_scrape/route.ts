import * as cheerio from "cheerio";
import { ObjectId } from "mongodb";
import type { NextRequest } from "next/server";
import { authUser } from "../../../auth";
import { Users } from "../../../models/user.server";
import { Steam } from "../../../sources/steam";
import {
  SteamAppAchievements,
  SteamStoreItems,
  SteamUserAchievements,
} from "../../../sources/steam.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { shuffle, unique } from "../../../utils";
import { fetchText, jsonStreamResponse } from "../scraper-utils";

export const maxDuration = 45;

export const GET = (request: NextRequest) =>
  jsonStreamResponse(async function* () {
    const user = await authUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.Steam,
      async function* (
        { config: { profile_url }, ...userDataSource },
        setUpdated,
      ) {
        setUpdated(false);

        const profileHtml = await fetchText(
          `https://steamcommunity.com/id/${profile_url}?l=english`,
        );

        const profile$ = cheerio.load(profileHtml);

        const recentAchievementsLinks = unique(
          profile$("a")
            .map((_, el) => profile$(el).attr("href"))
            .get()
            .filter((href) => href.includes(`id/${profile_url}/achievements`)),
        );

        yield recentAchievementsLinks;

        for (const link of shuffle(recentAchievementsLinks)) {
          const appid = Number(link.match(/\/achievements\/(\d+)/)?.[1]);
          if (!appid) continue;
          //          if (appid !== 394360) continue;
          yield appid;
          const achievementHtml = await fetchText(link);
          const achievement$ = cheerio.load(achievementHtml);
          const ssrDataJSON = achievement$("#valve-ssr-data").html();
          if (!ssrDataJSON) continue;
          const ssrData: unknown = JSON.parse(ssrDataJSON);
          if (!("renderContext" in (ssrData as Record<string, unknown>)))
            continue;
          const renderContextJSON = (ssrData as Record<string, unknown>)
            .renderContext;
          if (
            !renderContextJSON ||
            (!(typeof renderContextJSON !== "object") &&
              !("queryData" in renderContextJSON)) ||
            !(typeof renderContextJSON["queryData"] === "string")
          )
            continue;
          const queryData = JSON.parse(renderContextJSON["queryData"]) as {
            queries: { queryKey: string[]; state: { data: unknown } }[];
          };
          const mergedQueryData = queryData.queries.reduce(
            (acc: Steam.QueryData, query) => {
              query.queryKey.forEach((key, i, keys) => {
                switch (i) {
                  case 0:
                    acc[keys[0]!] ??= {};
                    if (keys.length - 1 === i) acc[keys[0]!] = query.state.data;
                    break;
                  case 1:
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    acc[keys[0]!][keys[1]!] ??= {};
                    if (keys.length - 1 === i)
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                      acc[keys[0]!][keys[1]!] = query.state.data;
                    break;
                  case 2:
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    acc[keys[0]!][keys[1]!][keys[2]!] ??= {};
                    if (keys.length - 1 === i)
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                      acc[keys[0]!][keys[1]!][keys[2]!] = query.state.data;
                    break;
                  case 3:
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    acc[keys[0]!][keys[1]!][keys[2]!][keys[3]!] ??= {};
                    if (keys.length - 1 === i)
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                      acc[keys[0]!][keys[1]!][keys[2]!][keys[3]!] =
                        query.state.data;
                    break;
                }
              });
              return acc;
            },
            {},
          );

          for (const { public_data, private_data } of Object.values(
            mergedQueryData.PlayerLinkDetails || {},
          )) {
            await Users.updateOne(
              { _id: new ObjectId(user.id) },
              {
                $set: {
                  "dataSources.$[source].config.steamid": public_data.steamid,
                  "dataSources.$[source].config.created_at": new Date(
                    private_data.time_created * 1000,
                  ),
                },
              },
              { arrayFilters: [{ "source.id": userDataSource.id }] },
            );
          }

          for (const [appid, achievementses] of Object.entries(
            mergedQueryData.achievements || {},
          )) {
            const appAchievementsSchema =
              achievementses?.schema_v2 || achievementses?.schema;

            const steamAppAchievements =
              appAchievementsSchema?.groups.flatMap((group) =>
                group.achievements.map(
                  (achievement): Steam.MongoSteamAppAchievement => ({
                    ...achievement,
                    globalpercentage:
                      achievementses.globalpercentages?.percentages?.[
                        achievement.internal_key
                      ] || null,
                    appid: Number(appid),
                    language: appAchievementsSchema?.language,
                  }),
                ),
              ) || [];
            yield `steamAppAchievements: ${steamAppAchievements.length}`;
            if (steamAppAchievements.length) {
              yield await SteamAppAchievements.bulkWrite(
                steamAppAchievements.map((achievement) => ({
                  updateOne: {
                    filter: {
                      appid: achievement.appid,
                      internal_key: achievement.internal_key,
                    },
                    update: { $set: achievement },
                    upsert: true,
                  },
                })),
              );
            }

            for (const userAchievementses of Object.values(
              achievementses?.user_achievements || {},
            )) {
              const steamUserAchievements = Object.values(
                userAchievementses.achievements,
              ).map((achievement): Steam.MongoSteamUserAchievement => ({
                ...achievement,
                appid: userAchievementses.appid,
                steamid: userAchievementses.steamid,
                unlocked_at: new Date(achievement.unlock_time * 1000),
              }));
              yield `steamUserAchievements: ${steamUserAchievements.length}`;
              if (steamUserAchievements.length) {
                yield await SteamUserAchievements.bulkWrite(
                  steamUserAchievements.map((achievement) => ({
                    updateOne: {
                      filter: {
                        appid: achievement.appid,
                        steamid: achievement.steamid,
                        internal_key: achievement.internal_key,
                      },
                      update: { $set: achievement },
                      upsert: true,
                    },
                  })),
                );
              }
            }
          }

          const steamStoreItems = Object.values(
            mergedQueryData.StoreItem ?? {},
          ).map((storeItem): Steam.MongoSteamStoreItem => ({
            ...storeItem.default_info,
            ...storeItem.include_assets_without_overrides,
          }));
          yield `steamStoreItems: ${steamStoreItems.length}`;
          if (steamStoreItems.length) {
            yield await SteamStoreItems.bulkWrite(
              steamStoreItems.map((storeItem) => ({
                updateOne: {
                  filter: { appid: storeItem.appid },
                  update: { $set: storeItem },
                  upsert: true,
                },
              })),
            );
          }
        }
      },
      request.nextUrl.searchParams.get("userDataSourceId"),
    );
  });
