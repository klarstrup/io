import { auth } from "../../../auth";
import {
  type KilterBoard,
  KilterBoardAscents,
} from "../../../sources/kilterboard";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const difficulty_grades = [
  {
    boulder_name: "1a/V0",
    difficulty: 1,
    is_listed: 0,
    route_name: "2b/5.1",
  },
  {
    boulder_name: "1b/V0",
    difficulty: 2,
    is_listed: 0,
    route_name: "2c/5.2",
  },
  {
    boulder_name: "1c/V0",
    difficulty: 3,
    is_listed: 0,
    route_name: "3a/5.3",
  },
  {
    boulder_name: "2a/V0",
    difficulty: 4,
    is_listed: 0,
    route_name: "3b/5.3",
  },
  {
    boulder_name: "2b/V0",
    difficulty: 5,
    is_listed: 0,
    route_name: "3c/5.4",
  },
  {
    boulder_name: "2c/V0",
    difficulty: 6,
    is_listed: 0,
    route_name: "4a/5.5",
  },
  {
    boulder_name: "3a/V0",
    difficulty: 7,
    is_listed: 0,
    route_name: "4b/5.6",
  },
  {
    boulder_name: "3b/V0",
    difficulty: 8,
    is_listed: 0,
    route_name: "4c/5.7",
  },
  {
    boulder_name: "3c/V0",
    difficulty: 9,
    is_listed: 0,
    route_name: "5a/5.8",
  },
  {
    boulder_name: "4a/V0",
    difficulty: 10,
    is_listed: 1,
    route_name: "5b/5.9",
  },
  {
    boulder_name: "4b/V0",
    difficulty: 11,
    is_listed: 1,
    route_name: "5c/5.10a",
  },
  {
    boulder_name: "4c/V0",
    difficulty: 12,
    is_listed: 1,
    route_name: "6a/5.10b",
  },
  {
    boulder_name: "5a/V1",
    difficulty: 13,
    is_listed: 1,
    route_name: "6a+/5.10c",
  },
  {
    boulder_name: "5b/V1",
    difficulty: 14,
    is_listed: 1,
    route_name: "6b/5.10d",
  },
  {
    boulder_name: "5c/V2",
    difficulty: 15,
    is_listed: 1,
    route_name: "6b+/5.11a",
  },
  {
    boulder_name: "6a/V3",
    difficulty: 16,
    is_listed: 1,
    route_name: "6c/5.11b",
  },
  {
    boulder_name: "6a+/V3",
    difficulty: 17,
    is_listed: 1,
    route_name: "6c+/5.11c",
  },
  {
    boulder_name: "6b/V4",
    difficulty: 18,
    is_listed: 1,
    route_name: "7a/5.11d",
  },
  {
    boulder_name: "6b+/V4",
    difficulty: 19,
    is_listed: 1,
    route_name: "7a+/5.12a",
  },
  {
    boulder_name: "6c/V5",
    difficulty: 20,
    is_listed: 1,
    route_name: "7b/5.12b",
  },
  {
    boulder_name: "6c+/V5",
    difficulty: 21,
    is_listed: 1,
    route_name: "7b+/5.12c",
  },
  {
    boulder_name: "7a/V6",
    difficulty: 22,
    is_listed: 1,
    route_name: "7c/5.12d",
  },
  {
    boulder_name: "7a+/V7",
    difficulty: 23,
    is_listed: 1,
    route_name: "7c+/5.13a",
  },
  {
    boulder_name: "7b/V8",
    difficulty: 24,
    is_listed: 1,
    route_name: "8a/5.13b",
  },
  {
    boulder_name: "7b+/V8",
    difficulty: 25,
    is_listed: 1,
    route_name: "8a+/5.13c",
  },
  {
    boulder_name: "7c/V9",
    difficulty: 26,
    is_listed: 1,
    route_name: "8b/5.13d",
  },
  {
    boulder_name: "7c+/V10",
    difficulty: 27,
    is_listed: 1,
    route_name: "8b+/5.14a",
  },
  {
    boulder_name: "8a/V11",
    difficulty: 28,
    is_listed: 1,
    route_name: "8c/5.14b",
  },
  {
    boulder_name: "8a+/V12",
    difficulty: 29,
    is_listed: 1,
    route_name: "8c+/5.14c",
  },
  {
    boulder_name: "8b/V13",
    difficulty: 30,
    is_listed: 1,
    route_name: "9a/5.14d",
  },
  {
    boulder_name: "8b+/V14",
    difficulty: 31,
    is_listed: 1,
    route_name: "9a+/5.15a",
  },
  {
    boulder_name: "8c/V15",
    difficulty: 32,
    is_listed: 1,
    route_name: "9b/5.15b",
  },
  {
    boulder_name: "8c+/V16",
    difficulty: 33,
    is_listed: 1,
    route_name: "9b+/5.15c",
  },
  {
    boulder_name: "9a/V17",
    difficulty: 34,
    is_listed: 0,
    route_name: "9c/5.15d",
  },
  {
    boulder_name: "9a+/V18",
    difficulty: 35,
    is_listed: 0,
    route_name: "9c+/5.16a",
  },
  {
    boulder_name: "9b/V19",
    difficulty: 36,
    is_listed: 0,
    route_name: "10a/5.16b",
  },
  {
    boulder_name: "9b+/V20",
    difficulty: 37,
    is_listed: 0,
    route_name: "10a+/5.16c",
  },
  {
    boulder_name: "9c/V21",
    difficulty: 38,
    is_listed: 0,
    route_name: "10b/5.16d",
  },
  {
    boulder_name: "9c+/V22",
    difficulty: 39,
    is_listed: 0,
    route_name: "10b+/5.17a",
  },
];

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
