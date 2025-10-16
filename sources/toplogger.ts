import { compareAsc, compareDesc } from "date-fns";
import type {
  ClimbLogScalars,
  ClimbScalars,
  CompClimbUserScalars,
  CompGymScalars,
  CompPouleScalars,
  CompRoundClimbScalars,
  CompRoundScalars,
  CompRoundUserScalars,
  CompScalars,
  CompUserScalars,
  GymScalars,
  HoldColorScalars,
} from "../app/api/toplogger_scrape/fragments";
import {
  type EventDetails,
  type EventEntry,
  type EventRound,
  EventSource,
  SCORING_SOURCE,
  SCORING_SYSTEM,
} from "../lib";
import { percentile } from "../utils";
import { filterFromReference, type Reference } from "../utils/graphql";
import { TopLoggerGraphQL } from "./toplogger.server";

function sharedStart(array: string[]) {
  const A = array.concat().sort();
  const a1 = A[0]!;
  const a2 = A[A.length - 1]!;
  const L = a1.length;
  let i = 0;
  while (i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
}

export async function getIoTopLoggerCompEvent(
  compId: string,
  ioId: string,
): Promise<EventDetails> {
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
  const compRounds = await TopLoggerGraphQL.find<CompRoundScalars>({
    __typename: "CompRound",
    compId: comp.id,
  }).toArray();
  const compPoules = await TopLoggerGraphQL.find<CompPouleScalars>({
    __typename: "CompPoule",
    id: { $in: compRounds.map((o) => o.compPouleId) },
  }).toArray();

  const gyms = await TopLoggerGraphQL.find<GymScalars>({
    __typename: "Gym",
    id: { $in: compGyms.map(({ gymId }) => gymId) },
  }).toArray();

  const gym = gyms[0]!;

  const holdColors = await TopLoggerGraphQL.find<HoldColorScalars>({
    __typename: "HoldColor",
  }).toArray();

  const commonVenue = sharedStart(gyms.map(({ name }) => name));

  return {
    source: EventSource.TopLogger,
    discipline: "bouldering",
    type: "competition",
    id: compId,
    ioId,
    url: `https://app.toplogger.nu/en-us/${gym.nameSlug}/competitions/${compId}`,
    start: comp.loggableStartAt,
    end: comp.loggableEndAt,
    venue: commonVenue,
    eventName: comp.name
      .replace("- Qualification", "")
      .replace("(Qualification)", "")
      .replace("(Mini-Comp)", "")
      .trim(),
    subEventName: comp.name.includes("- Qualification")
      ? "Qualification"
      : comp.name.includes("(Qualification)")
        ? "Qualification"
        : comp.name.includes("(Mini-Comp)")
          ? "Mini-Comp"
          : null,
    rounds: (
      await Promise.all(
        compRounds
          .sort((a, b) => compareAsc(a.loggableStartAt, b.loggableStartAt))
          .map(async (compRound): Promise<EventRound | null> => {
            const compRoundUsers =
              await TopLoggerGraphQL.find<CompRoundUserScalars>(
                { __typename: "CompRoundUser", compRoundId: compRound.id },
                { sort: { score: -1 } },
              ).toArray();
            let ioCompRoundUser = compRoundUsers.find(
              (cRU) => cRU.userId === ioId,
            );

            if (
              comp.id === "evybi3cx5lg54liqya27s" &&
              compRound.id === "2rozz53yr5mx6lqhi5o1h"
            ) {
              ioCompRoundUser = ioCompRoundUser ?? {
                __typename: "CompRoundUser",
                id:
                  "I don't think this matters here but it does have to be unique so " +
                  ioId +
                  comp.id,
                compUserId: "I don't think this matters here",
                userId: ioId,
                compId: comp.id,
                compRoundId: compRound.id,
                score: NaN,
                totMaxClips: NaN,
                totMaxHolds: NaN,
                totMaxZones: NaN,
                totMinTries: NaN,
                totMinDuration: NaN,
                climbsWithScoresCount: NaN,
                participating: true,
              };
            }
            if (
              comp.id === "odclzwjsasupvyrdlsv59" &&
              compRound.id === "roe9mllv90n3oa3lak423"
            ) {
              ioCompRoundUser = undefined;
            }

            if (!ioCompRoundUser) return null;

            const compRoundClimbs =
              await TopLoggerGraphQL.find<CompRoundClimbScalars>({
                __typename: "CompRoundClimb",
                compRoundId: compRound.id,
              }).toArray();
            const thisCompRoundClimbs =
              await TopLoggerGraphQL.find<ClimbScalars>({
                __typename: "Climb",
                id: { $in: compRoundClimbs.map((cCU) => cCU.climbId) },
              }).toArray();

            const roundClimbs = thisCompRoundClimbs.length
              ? thisCompRoundClimbs
              : await TopLoggerGraphQL.find<ClimbScalars>({
                  __typename: "Climb",
                  id: {
                    $in: (
                      await TopLoggerGraphQL.find<CompClimbUserScalars>({
                        __typename: "CompClimbUser",
                        compId: comp.id,
                      }).toArray()
                    ).map((cCU) => cCU.climbId),
                  },
                }).toArray();

            const ioClimbLogs = await TopLoggerGraphQL.find<ClimbLogScalars>(
              {
                __typename: "ClimbLog",
                userId: ioId,
                climbId: { $in: roundClimbs.map(({ id }) => id) },
                climbedAtDate: { $gt: new Date(0) },
              },
              { sort: { tickType: -1, climbedAtDate: 1 } },
            ).toArray();

            const ioRank =
              ioCompRoundUser && compRoundUsers.indexOf(ioCompRoundUser) + 1;

            const roundGyms = gyms.filter((gym) =>
              roundClimbs.some((crc) => crc.gymId === gym.id),
            );

            return {
              id: compRound.id,
              start: compRound.loggableStartAt,
              end: compRound.loggableEndAt,
              roundName: compRound.nameLoc,
              noParticipants: compRound.participantsCount,
              venue:
                roundGyms
                  .map(({ name }) => name)
                  .join(", ")
                  .replaceAll(commonVenue, "") || null,
              category: compPoules
                .find((cP) => cP.id === compRound?.compPouleId)
                ?.nameLoc.replace("♀️", "F")
                .replace("♂️", "M")
                .replace("Female", "F")
                .replace("Male", "M")
                .trim(),
              scores:
                ioCompRoundUser && !isNaN(ioCompRoundUser.score)
                  ? [
                      {
                        source: SCORING_SOURCE.OFFICIAL,
                        points: ioCompRoundUser.score,
                        percentile: percentile(
                          ioRank,
                          compRound.participantsCount,
                        ),
                        system: SCORING_SYSTEM.THOUSAND_DIVIDE_BY,
                        rank: ioRank,
                      } as const,
                    ]
                  : [],
              problems: roundClimbs.length,
              problemByProblem: Array.from(roundClimbs)
                .map((climb) => ({
                  climb,
                  climbLog: ioClimbLogs.find(
                    (climbLog) => climbLog.climbId === climb.id,
                  ),
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
                    holdColors.find(({ id }) => id === climb.holdColorId)
                      ?.color || undefined,
                  grade: climb.grade ? Number(climb.grade / 100) : undefined,
                  attemptCount: climbLog ? climbLog?.tryIndex + 1 : null,
                  attempt: climbLog ? climbLog.tickType == 0 : false,
                  // TopLogger does not do zones, at least not for Beta Boulders
                  zone: climbLog ? climbLog.tickType >= 1 : false,
                  top: climbLog ? climbLog.tickType >= 1 : false,
                  flash: climbLog ? climbLog.tickType >= 2 : false,
                  repeat: false,
                }))
                .sort((a, b) =>
                  Intl.Collator("en-DK", { numeric: true }).compare(
                    a.number,
                    b.number,
                  ),
                ),
            };
          }),
      )
    ).filter(Boolean),
  } as const;
}

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
    eventName: comp.name
      .replace("- Qualification", "")
      .replace("(Qualification)", "")
      .trim(),
    ioId: userId,
    start: comp.loggableStartAt,
    end: comp.loggableEndAt,
  } as const;
}
