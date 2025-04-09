import { auth } from "../../../auth";
import {
  difficultyToGradeMap,
  type KilterBoard,
} from "../../../sources/kilterboard";
import {
  KilterBoardAscents,
  KilterBoardBids,
} from "../../../sources/kilterboard.server";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { materializeAllKilterBoardWorkouts } from "../materialize_workouts/materializers";
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
      });
    }

    yield* materializeAllKilterBoardWorkouts({ user });
  });
