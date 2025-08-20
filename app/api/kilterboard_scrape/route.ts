import { compareDesc, isFuture, subDays, subMinutes, subWeeks } from "date-fns";
import { auth } from "../../../auth";
import { type KilterBoard } from "../../../sources/kilterboard";
import { KilterBoardClimbs } from "../../../sources/kilterboard.server";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.KilterBoard) continue;

      yield* wrapSource(dataSource, user, async function* ({ token }) {
        /*
        const { bids, ascents } = (await (
          await fetch("https://kilterboardapp.com/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Cookie: `token=${token}`,
            },
            body: "ascents=1970-01-01+00%3A00%3A00.000000&bids=1970-01-01+00%3A00%3A00.000000",
          })
        ).json()) as { ascents: KilterBoard.Ascent[]; bids: KilterBoard.Bid[] };

        for (const ascent of ascents) {
          await KilterBoardAscents.updateOne(
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
        }

        yield { ascents };

        for (const bid of bids) {
          await KilterBoardBids.updateOne(
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
        }

        yield { bids };
*/

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
          const { climbs } = (await (
            await fetch("https://kilterboardapp.com/sync", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: `token=${token}`,
              },
              body: `climbs=${syncDateString}`,
            })
          ).json()) as { climbs: KilterBoard.Climb[] };
          yield { [`climbs${syncDateString}`]: "inserting " + climbs.length };
          for (const climb of climbs) {
            await KilterBoardClimbs.updateOne(
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
          }
          yield { [`climbs${syncDateString}`]: "inserted " + climbs.length };

          if (climbs.length < 2000) {
            console.log(
              `stopped fetching climbs because there were less than 2000 in the last response (${climbs.length})`,
            );
            break;
          }
          const creationDateOfLastClimb = new Date(
            climbs.sort((a, b) =>
              compareDesc(new Date(a.created_at), new Date(b.created_at)),
            )[0]!.created_at,
          );

          syncDate = creationDateOfLastClimb;
        }
      });
    }
  });
