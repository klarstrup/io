import { auth } from "../../../auth";
import {
  type KilterBoard,
  KilterBoardAscents,
} from "../../../sources/kilterboard";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Approximate mapping of KilterBoard "difficulty" to TopLogger "grade"
export const difficultyToGradeMap = {
  1: 1,
  2: 1.33,
  3: 1.67,
  4: 2,
  5: 2.33,
  6: 2.67,
  7: 3,
  8: 3.33,
  9: 3.67,
  10: 4,
  11: 4.33,
  12: 4.67,
  13: 5,
  14: 5.33,
  15: 5.67,
  16: 6,
  17: 6.17,
  18: 6.33,
  19: 6.5,
  20: 6.67,
  21: 6.83,
  22: 7,
  23: 7.17,
  24: 7.33,
  25: 7.5,
  26: 7.67,
  27: 7.83,
  28: 8,
  29: 8.17,
  30: 8.33,
  31: 8.5,
  32: 8.67,
  33: 8.83,
  34: 9,
  35: 9.17,
  36: 9.33,
  37: 9.5,
  38: 9.67,
  39: 9.83,
} as const;

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
