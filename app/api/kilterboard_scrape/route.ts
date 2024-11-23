import { auth } from "../../../auth";
import {
  difficultyToGradeMap,
  type KilterBoard,
  KilterBoardAscents,
} from "../../../sources/kilterboard";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* (flushJSON) {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    const ascents = (
      (await (
        await fetch("https://kilterboardapp.com/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: "token=9468be6a6210b9c5b3fda928aa67c33ae02cf47a",
          },
          body: "ascents=1970-01-01+00%3A00%3A00.000000",
        })
      ).json()) as { ascents: KilterBoard.Ascent[] }
    ).ascents;

    for (const ascent of ascents) {
      await KilterBoardAscents.insertOne({
        ...ascent,
        grade: difficultyToGradeMap[ascent.difficulty] as number,
        climbed_at: new Date(ascent.climbed_at),
        created_at: new Date(ascent.created_at),
        updated_at: new Date(ascent.updated_at),
      });
    }

    await flushJSON({ ascents });
  });
