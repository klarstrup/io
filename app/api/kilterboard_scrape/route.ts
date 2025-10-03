import { auth } from "../../../auth";
import {
  difficultyToGradeMap,
  type KilterBoard,
} from "../../../sources/kilterboard";
import {
  KilterBoardAscents,
  KilterBoardBids,
  KilterBoardClimbs,
  KilterBoardClimbStats,
} from "../../../sources/kilterboard.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { fetchJson, jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.KilterBoard,
      async function* ({ config: { token } }, setUpdated) {
        setUpdated(false);

        const { bids, ascents } = await fetchJson<{
          ascents: KilterBoard.Ascent[];
          bids: KilterBoard.Bid[];
        }>("https://kilterboardapp.com/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: `token=${token}`,
          },
          body: "ascents=1970-01-01+00%3A00%3A00.000000&bids=1970-01-01+00%3A00%3A00.000000",
        });

        for (const ascent of ascents) {
          const updateResult = await KilterBoardAscents.updateOne(
            { uuid: ascent.uuid },
            {
              $set: {
                ...ascent,
                grade: difficultyToGradeMap[ascent.difficulty] as number,
                climbed_at: new Date(ascent.climbed_at),
                created_at: new Date(ascent.created_at),
                updated_at: new Date(ascent.updated_at),
              },
            },
            { upsert: true },
          );
          setUpdated(updateResult);
        }

        yield { ascents };

        for (const bid of bids) {
          const updateResult = await KilterBoardBids.updateOne(
            { uuid: bid.uuid },
            {
              $set: {
                ...bid,
                climbed_at: new Date(bid.climbed_at),
                created_at: new Date(bid.created_at),
                updated_at: new Date(bid.updated_at),
              },
            },
            { upsert: true },
          );
          setUpdated(updateResult);
        }

        yield { bids };

        await KilterBoardClimbs.createIndexes([
          { key: { created_at: -1 } },
          { key: { frames: -1 } },
        ]);
        const newestClimbInDatabase = await KilterBoardClimbs.findOne(
          {},
          { sort: { created_at: -1 } },
        );
        let syncDate = new Date(
          newestClimbInDatabase ? newestClimbInDatabase.created_at : 0,
        );
        while (true) {
          const syncDateString = `${syncDate.toISOString().split("T")[0]}+${encodeURIComponent(syncDate.toISOString().split("T")[1]!.split("Z")[0]!)}`;
          yield { [`climbs${syncDateString}`]: "requesting" };
          const { climbs, shared_syncs } = await fetchJson<{
            climbs: KilterBoard.Climb[];
            shared_syncs: [
              { table_name: "climbs"; last_synchronized_at: string },
            ];
          }>("https://kilterboardapp.com/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Cookie: `token=${token}`,
            },
            body: `climbs=${syncDateString}`,
          });

          yield { [`climbs${syncDateString}`]: "inserting " + climbs.length };
          for (const climb of climbs) {
            const updateResult = await KilterBoardClimbs.updateOne(
              { uuid: climb.uuid },
              {
                $set: {
                  ...climb,
                  created_at: new Date(climb.created_at),
                  updated_at: new Date(climb.updated_at),
                },
              },
              { upsert: true },
            );
            setUpdated(updateResult);
          }
          yield { [`climbs${syncDateString}`]: "inserted " + climbs.length };

          if (climbs.length < 2000) {
            console.log(
              `stopped fetching climbs because there were less than 2000 in the last response (${climbs.length})`,
            );
            break;
          }

          syncDate = new Date(shared_syncs[0].last_synchronized_at);
        }

        {
          await KilterBoardClimbStats.createIndexes([
            { key: { climb_uuid: 1, angle: 1 }, unique: true },
            { key: { created_at: -1 } },
          ]);
          const newestClimbStatInDatabase = await KilterBoardClimbStats.findOne(
            {},
            { sort: { created_at: -1 } },
          );
          let syncDate = new Date(
            newestClimbStatInDatabase
              ? newestClimbStatInDatabase.created_at
              : 0,
          );
          while (true) {
            const syncDateString = `${syncDate.toISOString().split("T")[0]}+${encodeURIComponent(syncDate.toISOString().split("T")[1]!.split("Z")[0]!)}`;
            yield { [`climb_stats${syncDateString}`]: "requesting" };
            const { climb_stats, shared_syncs } = await fetchJson<{
              climb_stats: KilterBoard.ClimbStat[];
              shared_syncs: [
                { table_name: "climb_stats"; last_synchronized_at: string },
              ];
            }>("https://kilterboardapp.com/sync", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: `token=${token}`,
              },
              body: `climb_stats=${syncDateString}`,
            });

            yield {
              [`climb_stats${syncDateString}`]:
                "inserting " + climb_stats.length,
            };
            for (const climb_stat of climb_stats) {
              const updateResult = await KilterBoardClimbStats.updateOne(
                { climb_uuid: climb_stat.climb_uuid, angle: climb_stat.angle },
                {
                  $set: {
                    ...climb_stat,
                    grade_average:
                      climb_stat.difficulty_average &&
                      (difficultyToGradeMap[
                        Math.round(climb_stat.difficulty_average)
                      ] as number),
                    benchmark_grade:
                      climb_stat.benchmark_grade &&
                      (difficultyToGradeMap[
                        climb_stat.benchmark_grade
                      ] as number),
                    created_at: new Date(climb_stat.created_at),
                    updated_at: new Date(climb_stat.updated_at),
                    fa_at: climb_stat.fa_at && new Date(climb_stat.fa_at),
                  },
                },
                { upsert: true },
              );
              setUpdated(updateResult);
            }
            yield {
              [`climb_stats${syncDateString}`]:
                "inserted " + climb_stats.length,
            };

            if (climb_stats.length < 2000) {
              yield `stopped fetching climb_stats because there were less than 2000 in the last response (${climb_stats.length})`;
              break;
            }

            syncDate = new Date(shared_syncs[0].last_synchronized_at);
          }
        }
      },
    );
  });
