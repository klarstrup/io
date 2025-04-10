import { isAfter, isBefore } from "date-fns";
import {
  ClimbLogScalars,
  ClimbScalars,
  CompClimbUserScalars,
  CompGymScalars,
  CompScalars,
  CompUserScalars,
  GymScalars,
  HoldColorScalars,
} from "../app/api/toplogger_scrape/fragments";
import { type EventEntry, EventSource, type Score } from "../lib";
import { type Reference, filterFromReference } from "../utils/graphql";
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

  const compClimbUsers = await TopLoggerGraphQL.find<CompClimbUserScalars>({
    __typename: "CompClimbUser",
    compId: comp.id,
  }).toArray();

  const climbs = await TopLoggerGraphQL.find<ClimbScalars>({
    __typename: "Climb",
    id: { $in: compClimbUsers.map(({ climbId }) => climbId) },
  }).toArray();

  const io = compUser;
  if (!io) throw new Error("io not found");

  const ioClimbLogs = await TopLoggerGraphQL.find<ClimbLogScalars>({
    __typename: "ClimbLog",
    userId: ioId,
    climbId: { $in: climbs.map(({ id }) => id) },
    climbedAtDate: { $gt: new Date(0) },
  }).toArray();

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
    url: `https://app.toplogger.nu/en-us/${gym.nameSlug}/competitions/${compId}`,
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
    category: null, // TODO: Io poule names
    team: null,
    noParticipants: NaN,
    problems: climbs.length,
    problemByProblem: climbs
      .map((climb) => {
        const ioClimbLog = ioClimbLogs.find(
          (climbLog) => climbLog.climbId === climb.id,
        );

        return {
          number: climb.name || "",
          color:
            holdColors.find(({ id }) => id === climb.holdColorId)?.color ||
            undefined,
          grade: climb.grade ? Number(climb.grade / 100) : undefined,
          attempt: ioClimbLog ? ioClimbLog.tickType == 0 : false,
          // TopLogger does not do zones, at least not for Beta Boulders
          zone: ioClimbLog ? ioClimbLog.tickType >= 1 : false,
          top: ioClimbLog ? ioClimbLog.tickType >= 1 : false,
          flash: ioClimbLog ? ioClimbLog.tickType >= 2 : false,
          repeat: false,
        };
      })
      .sort((a, b) =>
        Intl.Collator("en-DK", { numeric: true }).compare(a.number, b.number),
      ),
    // Left as an exercise for the reader
    scores: [] as Score[] /* ||
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
