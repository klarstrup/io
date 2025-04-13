import { compareDesc, isAfter, isBefore } from "date-fns";
import type {
  ClimbLogScalars,
  ClimbScalars,
  CompClimbUserScalars,
  CompGymScalars,
  CompPouleScalars,
  CompRoundScalars,
  CompRoundUserScalars,
  CompScalars,
  CompUserScalars,
  GymScalars,
  HoldColorScalars,
} from "../app/api/toplogger_scrape/fragments";
import {
  type EventEntry,
  EventSource,
  type Score,
  SCORING_SOURCE,
  SCORING_SYSTEM,
} from "../lib";
import { percentile, unique } from "../utils";
import { filterFromReference, type Reference } from "../utils/graphql";
import { TopLoggerGraphQL } from "./toplogger.server";

export async function getIoTopLoggerCompEvent(compId: string, ioId: string) {
  const compUser = await TopLoggerGraphQL.findOne<CompUserScalars>({
    compId,
    userId: ioId,
    __typename: "CompUser",
  });

  if (!compUser) throw new Error("CompUser not found");

  const comp = await TopLoggerGraphQL.findOne<
    CompScalars & { compGyms: Reference<CompGymScalars>[] }
  >({ id: compUser.compId, __typename: "Comp" });

  if (!comp) throw new Error("Comp not found");

  const compGyms = await TopLoggerGraphQL.find<CompGymScalars>({
    __typename: "CompGym",
    id: { $in: comp.compGyms.map((ref) => filterFromReference(ref).id) },
  }).toArray();

  const gyms = await TopLoggerGraphQL.find<GymScalars>({
    __typename: "Gym",
    id: { $in: compGyms.map(({ gymId }) => gymId) },
  }).toArray();

  const ioCompRoundUser = await TopLoggerGraphQL.findOne<CompRoundUserScalars>({
    __typename: "CompRoundUser",
    compId: comp.id,
    userId: ioId,
  });
  const ioCompRound = await TopLoggerGraphQL.findOne<CompRoundScalars>({
    __typename: "CompRound",
    id: ioCompRoundUser?.compRoundId,
  });
  const ioCompPoule = await TopLoggerGraphQL.findOne<CompPouleScalars>({
    __typename: "CompPoule",
    id: ioCompRound?.compPouleId,
  });
  const ioCompRoundUsers = await TopLoggerGraphQL.find<CompRoundUserScalars>(
    {
      __typename: "CompRoundUser",
      compId: comp.id,
      compRoundId: ioCompRound?.id,
    },
    { sort: { score: -1 } },
  ).toArray();

  const ioRank =
    ioCompRoundUser &&
    ioCompRoundUsers.findIndex(({ id }) => id === ioCompRoundUser.id) + 1;

  const compClimbUsers = await TopLoggerGraphQL.find<CompClimbUserScalars>({
    __typename: "CompClimbUser",
    compId: comp.id,
  }).toArray();
  const climbs = await TopLoggerGraphQL.find<ClimbScalars>({
    __typename: "Climb",
    id: { $in: unique(compClimbUsers.map(({ climbId }) => climbId)) },
  }).toArray();

  const ioClimbLogs = await TopLoggerGraphQL.find<ClimbLogScalars>(
    {
      __typename: "ClimbLog",
      userId: ioId,
      climbId: { $in: climbs.map(({ id }) => id) },
      climbedAtDate: { $gt: new Date(0) },
    },
    { sort: { tickType: -1, climbedAtDate: 1 } },
  ).toArray();

  let firstClimbLog: Date | null = null;
  let lastClimbLog: Date | null = null;
  for (const climbLog of ioClimbLogs || []) {
    const date = climbLog.climbedAtDate;
    if (!date) continue;
    if (!firstClimbLog || isBefore(date, firstClimbLog)) firstClimbLog = date;
    if (!lastClimbLog || isAfter(date, lastClimbLog)) lastClimbLog = date;
  }

  const gym = gyms[0]!;

  const holdColors = await TopLoggerGraphQL.find<HoldColorScalars>({
    __typename: "HoldColor",
  }).toArray();

  const r = {
    source: EventSource.TopLogger,
    discipline: "bouldering",
    type: "competition",
    id: compId,
    ioId,
    url: ioCompRound
      ? `https://app.toplogger.nu/en-us/${gym.nameSlug}/competitions/${compId}/rounds/${ioCompRound.id}`
      : `https://app.toplogger.nu/en-us/${gym.nameSlug}/competitions/${compId}`,
    start: comp.loggableStartAt,
    end: comp.loggableEndAt,
    venue: gyms.map(({ name }) => name).join(", ") || null,
    location: gyms.map(({ name }) => name).join(", ") || null,
    event: comp.name
      .replace("- Qualification", "")
      .replace("(Qualification)", "")
      .replace("(Mini-Comp)", "")
      .trim(),
    subEvent: comp.name.includes("- Qualification")
      ? "Qualification"
      : comp.name.includes("(Qualification)")
        ? "Qualification"
        : comp.name.includes("(Mini-Comp)")
          ? "Mini-Comp"
          : null,
    category: ioCompPoule?.nameLoc.replace("♀️", "F").replace("♂️", "M").trim(),
    team: null,
    noParticipants: ioCompRoundUsers.length,
    problems: climbs.length,
    problemByProblem: Array.from(climbs)
      .map((climb) => ({
        climb,
        climbLog: ioClimbLogs.find((climbLog) => climbLog.climbId === climb.id),
      }))
      .sort((a, b) =>
        compareDesc(
          a.climbLog?.climbedAtDate || a.climb.inAt,
          b.climbLog?.climbedAtDate || b.climb.inAt,
        ),
      )
      .map(({ climb, climbLog }) => ({
        number: climb.name || "",
        color:
          holdColors.find(({ id }) => id === climb.holdColorId)?.color ||
          undefined,
        grade: climb.grade ? Number(climb.grade / 100) : undefined,
        attempt: climbLog ? climbLog.tickType == 0 : false,
        // TopLogger does not do zones, at least not for Beta Boulders
        zone: climbLog ? climbLog.tickType >= 1 : false,
        top: climbLog ? climbLog.tickType >= 1 : false,
        flash: climbLog ? climbLog.tickType >= 2 : false,
        repeat: false,
      }))
      .sort((a, b) =>
        Intl.Collator("en-DK", { numeric: true }).compare(a.number, b.number),
      ),
    // Left as an exercise for the reader
    scores: ioCompRoundUser
      ? ([
          {
            source: SCORING_SOURCE.OFFICIAL,
            points: ioCompRoundUser.score,
            percentile: percentile(ioRank!, ioCompRoundUsers.length),
            system: SCORING_SYSTEM.THOUSAND_DIVIDE_BY,
            rank: ioRank!,
          },
        ] satisfies Score[])
      : ([] as Score[]) /* ||
      getIoTopLoggerGroupScores(
        comp,
        io,
        groupUsers,
        participants,
        ascends,
        sex,
      )*/,
  } as const;

  return r;
}

/*
function getIoTopLoggerGroupScores(
  comp: Comp,
  io: CompUser,
  groupUsers: Omit<TopLogger.GroupUserMultiple, "user">[],
  participants: TopLogger.User[],
  ascends: TopLogger.AscendSingle[],
  sex?: boolean,
) {
  const topsByClimbId = ascends.reduce(
    (topMemo, { climb_id, user_id, checks }) => {
      if (groupUsers.some((user) => user.user_id === user_id) && checks) {
        topMemo.set(climb_id, (topMemo.get(climb_id) || 0) + 1);
      }
      return topMemo;
    },
    new Map<number, number>(),
  );

  const usersWithResults = groupUsers.map(({ user_id, score, rank }) => {
    const user = participants.find(({ id }) => id === user_id);
    let tdbScore = 0;
    let ptsScore = 0;

    const userAscends = ascends.filter((ascend) => ascend.user_id === user_id);
    for (const { climb_id, checks } of userAscends) {
      let problemTDBScore = TDB_BASE / (topsByClimbId.get(climb_id) || 0);

      if (checks) {
        ptsScore += PTS_SEND;
        if (checks >= 2) {
          ptsScore += PTS_FLASH_BONUS;
          problemTDBScore *= TDB_FLASH_MULTIPLIER;
        }
        tdbScore += problemTDBScore;
      }
    }

    return { user_id, user, score, rank, ptsScore, tdbScore } as const;
  });

  const ioResults =
    usersWithResults.find(({ user_id }) => user_id === io.id) ?? null;

  const noParticipants = participants.length || NaN;

  const scores: Score[] = [];
  if (ioResults && isPast(comp.loggableStartAt)) {
    const ioRank =
      Array.from(usersWithResults)
        .filter(({ user }) => (sex ? user?.gender === io.gender : true))
        .sort((a, b) => Number(b.score) - Number(a.score))
        .findIndex(({ user_id }) => user_id === io.id) + 1;

    if (comp.score_system === "points") {
      scores.push({
        system: SCORING_SYSTEM.POINTS,
        source: SCORING_SOURCE.OFFICIAL,
        rank: ioRank,
        percentile: percentile(ioRank, noParticipants),
        points: Number(ioResults.score),
      } satisfies PointsScore);
    }
    if (comp.score_system === "thousand_divide_by") {
      scores.push({
        system: SCORING_SYSTEM.THOUSAND_DIVIDE_BY,
        source: SCORING_SOURCE.OFFICIAL,
        rank: ioRank,
        percentile: percentile(ioRank, noParticipants),
        points: Number(ioResults.score),
      } satisfies ThousandDivideByScore);
    }
  }

  return scores;
}
*/
export async function getTopLoggerCompEventEntry(
  compId: string,
  userId: string,
): Promise<EventEntry> {
  const compUser = await TopLoggerGraphQL.findOne<CompUserScalars>({
    __typename: "CompUser",
    compId,
    userId,
  });

  if (!compUser) throw new Error("CompUser not found");

  const comp = await TopLoggerGraphQL.findOne<
    CompScalars & { compGyms: Reference<CompGymScalars>[] }
  >({ __typename: "Comp", id: compUser.compId });

  if (!comp) throw new Error("Comp not found");

  const compGyms = await TopLoggerGraphQL.find<CompGymScalars>({
    __typename: "CompGym",
    id: { $in: comp.compGyms.map((ref) => filterFromReference(ref).id) },
  }).toArray();

  const gyms = await TopLoggerGraphQL.find<GymScalars>({
    __typename: "Gym",
    id: { $in: compGyms.map(({ gymId }) => gymId) },
  }).toArray();

  return {
    source: EventSource.TopLogger,
    type: "competition",
    discipline: "bouldering",
    id: compUser.compId,
    venue: gyms.map(({ name }) => name).join(", ") || null,
    location: gyms.map(({ name }) => name).join(", ") || null,
    event: comp.name
      .replace("- Qualification", "")
      .replace("(Qualification)", "")
      .trim(),
    subEvent: null,
    ioId: userId,
    start: comp.loggableStartAt,
    end: comp.loggableEndAt,
  } as const;
}
