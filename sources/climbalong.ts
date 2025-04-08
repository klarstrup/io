import {
  addHours,
  addWeeks,
  isAfter,
  isBefore,
  isFuture,
  isWithinInterval,
  min,
  subHours,
} from "date-fns";
import { dbFetch } from "../fetch";
import {
  EventEntry,
  EventSource,
  SCORING_SOURCE,
  SCORING_SYSTEM,
  Score,
  TopsAndZonesScore,
} from "../lib";
import {
  DAY_IN_SECONDS,
  MINUTE_IN_SECONDS,
  WEEK_IN_SECONDS,
  cotemporality,
  percentile,
  unique,
} from "../utils";
import {
  ClimbAlongAthletes,
  ClimbAlongCircuits,
  ClimbAlongCompetitions,
  ClimbAlongLanes,
  ClimbAlongPerformances,
  ClimbAlongProblems,
  ClimbAlongRounds,
} from "./climbalong.server";

export namespace Climbalong {
  export type CircuitChallengeNodesGroupedByLane = [
    number,
    {
      nodeId: number;
      nodeType: NodeType.CircuitChallenge;
      competitionId: number;
      inputsFrom: {
        nodeId: number;
        edgeId: number;
      }[];
      outputEdgeIds: number[];
      inputTitle: string;
      nodeOutputType: {
        scoreSystem: string;
        numberOfAttemptsCounted: boolean;
        numberOfScoringHolds: number;
        ranked: boolean;
      };
      circuit: Climbalong.Circuit;
      selfscoring: boolean;
      selfscoringOpen: Date | null;
      selfscoringClose: Date | null;
      pickTopPerformancesAmount: number;
      outputRanked: boolean;
      nodeName: string;
    }[],
  ][];

  export interface Athlete {
    athleteId: number;
    competitionId: number;
    bib: null;
    name: string;
    dateOfBirth: Date;
    sex: Sex;
    category: string;
    nationality: null | string;
    club: null | string;
    tags: unknown;
    checkedIn: boolean;
    countryId: null;
    countryName: null;
    countryCode: null;
    flagLink: null;
    userId: string;
    region: null | string;
    didNotShow: boolean | null;
  }

  export enum Sex {
    F = "F",
    M = "M",
  }

  export interface Competition {
    competitionId: number;
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    urlFriendlyAbbreviation: null;
    columnsInAthleteLists: null;
    climbAlongLocationId: number;
    listed: boolean;
    athleteRegistrationSubject: string;
    athleteRegistrationMessage: string;
    officialRegistrationSubject: string;
    officialRegistrationMessage: string;
    address: string;
    facility: string;
    city: string;
    countries: string[];
    imageName: string;
    eventLink: string;
    showRegisterButton: boolean;
    signUpOpen: boolean;
    participantLimit: number;
    thumbnail: string;
    autoCheckIn: boolean;
  }

  export interface Performance {
    circuitId: number;
    athleteId: number;
    problemId: number;
    judgeId: null;
    performanceStartedTime: Date;
    performanceEndedTime: Date | null;
    didNotStart: boolean;
    numberOfAttempts: number;
    attempts: Attempt[];
    scores: Score[];
    registrationTime: Date;
  }

  export interface Attempt {
    attemptNumber: number;
    holdsReached: Score[];
  }

  export interface Score {
    holdId: number;
    holdScore: HoldScore | HoldScore2;
    reachedInAttempt: number;
    reachedTime: Date | null;
  }

  export interface Lane {
    laneId: number;
    competitionId: number;
    startNodeId: number;
    startEdgeId: number;
    endNodeId: number;
    endEdgeId: number;
    title: string;
    description: string;
    roundId: number;
    scheduledStart: null;
    scheduledEnd: null;
    sortOrder: number;
    isResultsOnly: boolean;
  }

  export interface Round {
    roundId: number;
    competitionId: number;
    title: string;
    description: string;
    scheduledStart: null;
    scheduledEnd: null;
    sortOrder: number;
  }
  export interface Problem {
    problemId: number;
    title: string;
    discipline: number;
    circuitId: number;
    climbAlongRouteId: number;
    sortOrder: number;
    imageName: string;
    categoryId: string;
  }
  export interface Circuit {
    competitionId: number;
    circuitId: number;
    title: string;
  }

  export enum NodeType {
    CircuitChallenge = 309,
  }
}
export enum HoldScore {
  "TOP" = 4,
  "ZONE" = 1,
}
export enum HoldScore2 {
  "TOP" = 25,
  "ZONE" = 10,
}

const isTop = (holdScore: HoldScore | HoldScore2) =>
  holdScore === HoldScore.TOP || holdScore === HoldScore2.TOP;

const isZone = (holdScore: HoldScore | HoldScore2) =>
  holdScore === HoldScore.ZONE || holdScore === HoldScore2.ZONE;

const TDB_BASE = 1000;
const TDB_FLASH_MULTIPLIER = 1.1;
const PTS_SEND = 100;
const PTS_FLASH_BONUS = 20;

export async function getIoClimbAlongCompetitionEvent(
  competitionId: number,
  athleteId: number,
) {
  const competition = await ClimbAlongCompetitions.findOne({ competitionId });
  if (!competition) throw new Error("???");

  const competitionTime = cotemporality({
    start: new Date(competition.startTime),
    end: new Date(competition.endTime),
  });

  const maxAge: NonNullable<Parameters<typeof dbFetch>[2]>["maxAge"] =
    competitionTime === "current"
      ? 30
      : isWithinInterval(new Date(), {
            start: subHours(new Date(competition.startTime), 3),
            end: addHours(new Date(competition.endTime), 1),
          })
        ? MINUTE_IN_SECONDS
        : competitionTime === "past"
          ? isWithinInterval(new Date(), {
              start: new Date(competition.startTime),
              end: addWeeks(new Date(competition.endTime), 1),
            })
            ? DAY_IN_SECONDS
            : undefined
          : WEEK_IN_SECONDS;

  const athletes = await ClimbAlongAthletes.find({ competitionId }).toArray();
  const io = athletes.find((athlete) => athlete.athleteId === athleteId);
  const rounds = await ClimbAlongRounds.find({ competitionId }).toArray();
  const lanes = await ClimbAlongLanes.find({ competitionId }).toArray();
  const circuits = await ClimbAlongCircuits.find({ competitionId }).toArray();
  const performances = await ClimbAlongPerformances.find({
    circuitId: { $in: circuits.map(({ circuitId }) => circuitId) },
  }).toArray();
  console.log(circuits);
  const problems = await ClimbAlongProblems.find({
    circuitId: { $in: circuits.map(({ circuitId }) => circuitId) },
  }).toArray();

  const circuitChallengeNodesGroupedByLane =
    await dbFetch<Climbalong.CircuitChallengeNodesGroupedByLane>(
      `https://comp.climbalong.com/api/v1/competitions/${competitionId}/circuitchallengenodesgroupedbylane`,
      undefined,
      { maxAge },
    );

  const noProblems = new Set(problems.map(({ title }) => title)).size || NaN;

  const ioPerformances =
    io && performances.filter(({ athleteId }) => athleteId === io.athleteId);

  const ioCircuitIds = ioPerformances
    ? unique(ioPerformances.map(({ circuitId }) => circuitId))
    : [];

  let firstPerformance: Date | null = null;
  let lastPerformance: Date | null = null;
  for (const {
    performanceStartedTime,
    performanceEndedTime,
    registrationTime,
  } of ioPerformances || []) {
    const start = new Date(performanceStartedTime);
    if (!firstPerformance || isBefore(start, firstPerformance)) {
      firstPerformance = start;
    }

    const end = new Date(performanceEndedTime || registrationTime);
    if (!lastPerformance || isAfter(end, lastPerformance)) {
      lastPerformance = end;
    }
  }

  const [topsByProblemTitle, zonesByProblemTitle] = performances.reduce(
    ([topMemo, zoneMemo], performance) => {
      const problem = problems.find(
        (p) => p.problemId === performance.problemId,
      );

      if (
        problem &&
        athletes.some((athlete) => athlete.athleteId === performance.athleteId)
      ) {
        const key = problem.title;
        for (const score of performance.scores) {
          if (isZone(score.holdScore)) {
            zoneMemo.set(key, (zoneMemo.get(key) || 0) + 1);
          }
          if (isTop(score.holdScore)) {
            topMemo.set(key, (topMemo.get(key) || 0) + 1);
          }
        }
      }
      return [topMemo, zoneMemo] as const;
    },
    [new Map<string, number>(), new Map<string, number>()],
  );

  const atheletesWithResults = athletes
    .map((athlete) => {
      let topsTDBScore = 0;
      let zonesTDBScore = 0;
      let ptsScore = 0;
      let tops = 0;
      let zones = 0;
      let topsAttempts = 0;
      let zonesAttempts = 0;

      const athletePerformances = performances.filter(
        (performance) => performance.athleteId === athlete.athleteId,
      );
      for (const performance of athletePerformances) {
        const problem = problems.find(
          (p) => p.problemId === performance.problemId,
        );
        if (!problem) continue;

        const key = problem.title;
        let problemTopTDBScore = TDB_BASE / (topsByProblemTitle.get(key) || 0);
        let problemZoneTDBScore =
          TDB_BASE / (zonesByProblemTitle.get(key) || 0);

        for (const score of performance.scores) {
          if (isTop(score.holdScore)) {
            topsAttempts += score.reachedInAttempt;
            tops += 1;
            ptsScore += PTS_SEND;
            if (score.reachedInAttempt === 1) {
              ptsScore += PTS_FLASH_BONUS;
              problemTopTDBScore *= TDB_FLASH_MULTIPLIER;
            }
            topsTDBScore += problemTopTDBScore;
          } else if (isZone(score.holdScore)) {
            if (score.reachedInAttempt === 1) {
              problemZoneTDBScore *= TDB_FLASH_MULTIPLIER;
            }
            zonesAttempts += score.reachedInAttempt;
            zones += 1;
            zonesTDBScore += problemZoneTDBScore;
          }
        }
      }

      return {
        athlete,
        ptsScore,
        topsTDBScore,
        zonesTDBScore,
        tops,
        zones,
        topsAttempts,
        zonesAttempts,
      } as const;
    })
    .filter(
      ({ tops, zones, topsAttempts, zonesAttempts }) =>
        tops + zones + topsAttempts + zonesAttempts,
    );

  const circuitChallenges = await Promise.all(
    lanes.map((lane) =>
      dbFetch<{
        node: string;
        title: string;
        athletes: {
          athleteId: number;
          performanceSum: {
            athleteId: number;
            rank: number;
            scoreSums: {
              holdScore: HoldScore | HoldScore2;
              totalNumberOfTimesReached: number;
              totalNumberOfAttemptsUsed: number;
            }[];
            prevRank: null;
          } | null;
        }[];
        ranked: boolean;
        processedBy: {
          nodeId: number;
          nodeType: Climbalong.NodeType;
          edge: number;
        }[];
      }>(
        `https://comp.climbalong.com/api/v0/nodes/${lane.endNodeId}/edges/${lane.endEdgeId}`,
        undefined,
        { maxAge },
      ),
    ),
  );

  const ioCircuitChallenge =
    io &&
    circuitChallenges.find(({ athletes }) =>
      athletes.some((athlete) => athlete.athleteId === io?.athleteId),
    );

  const ioPerformanceSum = ioCircuitChallenge?.athletes.find(
    (athlete) => athlete.athleteId === io?.athleteId,
  )?.performanceSum;

  const noParticipants =
    (circuitChallenges.find(({ athletes }) =>
      athletes.some((athletes) => athletes.athleteId === io?.athleteId),
    )?.athletes?.length ??
      atheletesWithResults.length) ||
    NaN;

  const scores: Score[] = [];

  const ioResults =
    io &&
    atheletesWithResults.find(
      ({ athlete }) => athlete.athleteId === io.athleteId,
    );

  if (ioPerformanceSum) {
    const tops = ioPerformanceSum.scoreSums
      .filter(({ holdScore }) => isTop(holdScore))
      .reduce(
        (sum, { totalNumberOfTimesReached }) => sum + totalNumberOfTimesReached,
        0,
      );
    const topsAttempts = ioPerformanceSum.scoreSums
      .filter(({ holdScore }) => isTop(holdScore))
      .reduce(
        (sum, { totalNumberOfAttemptsUsed }) => sum + totalNumberOfAttemptsUsed,
        0,
      );
    const zones = ioPerformanceSum.scoreSums
      .filter(({ holdScore }) => isZone(holdScore))
      .reduce(
        (sum, { totalNumberOfTimesReached }) => sum + totalNumberOfTimesReached,
        0,
      );
    const zonesAttempts = ioPerformanceSum.scoreSums
      .filter(({ holdScore }) => isZone(holdScore))
      .reduce(
        (sum, { totalNumberOfAttemptsUsed }) => sum + totalNumberOfAttemptsUsed,
        0,
      );

    scores.push({
      system: SCORING_SYSTEM.TOPS_AND_ZONES,
      source: SCORING_SOURCE.OFFICIAL,
      rank: ioPerformanceSum.rank,
      percentile: percentile(ioPerformanceSum.rank, noParticipants),
      tops: ioResults?.tops || tops || NaN,
      zones: ioResults?.zones || zones || NaN,
      topsAttempts: ioResults?.topsAttempts || topsAttempts || NaN,
      zonesAttempts: ioResults?.zonesAttempts || zonesAttempts || NaN,
    } satisfies TopsAndZonesScore);
  }

  return {
    source: "climbalong",
    type: "competition",
    discipline: "bouldering",
    id: competitionId,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
    ioId: io?.athleteId!,
    url:
      rounds[0] && lanes[0]
        ? `https://climbalong.com/competitions/${competitionId}/results`
        : `https://climbalong.com/competitions/${competitionId}/info`,
    start: new Date(
      firstPerformance ||
        circuitChallengeNodesGroupedByLane.find(
          ([, [challengeNode]]) => challengeNode?.selfscoringOpen,
        )?.[1][0]?.selfscoringOpen ||
        competition.startTime,
    ),
    end: isFuture(new Date(competition.endTime))
      ? new Date(competition.endTime)
      : min([
          new Date(
            lastPerformance ||
              circuitChallengeNodesGroupedByLane.find(
                ([, [challengeNode]]) => challengeNode?.selfscoringClose,
              )?.[1][0]?.selfscoringClose ||
              competition.endTime,
          ),
          new Date(competition.endTime),
        ]),
    venue: competition.facility.trim(),
    event: competition.title.trim(),
    subEvent: null,
    location: competition.address,
    category:
      ioCircuitChallenge?.title
        ?.replace("Mænd/", "")
        ?.replace("Male / ", "")
        ?.replace("Male", "Open") || null,
    team: null,
    noParticipants,
    problems: problems.length
      ? problems.filter((problem) => ioCircuitIds.includes(problem.circuitId))
          .length
      : noProblems,
    problemByProblem: problems.length
      ? Array.from(
          problems
            .filter((problem) => ioCircuitIds.includes(problem.circuitId))
            .reduce(
              (memo, problem) => {
                const ioPerformance = ioPerformances?.find(
                  (performance) => performance.problemId === problem.problemId,
                );

                // More nastiness here because each problem is repeated for each lane
                const key = problem.title;
                memo.set(key, {
                  number: problem.title,
                  color: undefined,
                  grade: undefined,
                  attempt: Boolean(
                    ioPerformance?.numberOfAttempts || memo.get(key)?.attempt,
                  ),
                  zone: Boolean(
                    ioPerformance?.scores.some((score) =>
                      isZone(score.holdScore),
                    ) || memo.get(key)?.zone,
                  ),
                  top: Boolean(
                    ioPerformance?.scores.some((score) =>
                      isTop(score.holdScore),
                    ) || memo.get(key)?.top,
                  ),
                  flash: Boolean(
                    ioPerformance?.scores.some(
                      (score) =>
                        isTop(score.holdScore) && score.reachedInAttempt === 1,
                    ) || memo.get(key)?.flash,
                  ),
                  repeat: false,
                });

                return memo;
              },
              new Map<
                string,
                {
                  number: string;
                  color: string | undefined;
                  grade: number | undefined;
                  attempt: boolean;
                  zone: boolean;
                  top: boolean;
                  flash: boolean;
                  repeat: false;
                }
              >(),
            )
            .values(),
        )
      : null,
    scores,
  } as const;
}

export async function getIoClimbAlongCompetitionEventEntry(
  competitionId: number,
  athleteId: number,
): Promise<EventEntry> {
  const competition = await ClimbAlongCompetitions.findOne({ competitionId });

  if (!competition) {
    throw new Error("???");
  }

  return {
    source: EventSource.ClimbAlong,
    type: "competition",
    discipline: "bouldering",
    id: competitionId,
    venue: competition.facility.trim(),
    event: competition.title.trim(),
    subEvent: null,
    location: competition.address,
    ioId: athleteId,
    start: new Date(competition.startTime),
    end: new Date(competition.endTime),
  } as const;
}

export const ioClimbAlongEventsWithIds = [
  [13, 844],
  [20, 1284],
  [26, 3381],
  [27, 8468],
  [28, 10770],
  [30, 11951],
  [32, 12091],
  [33, 12477],
  [34, 14063],
  [147],
  [148],
  [150, 25938],
  [151],
  [269],
  [270],
  [271],
  [272],
  [273],
  [274],
  [275],
  [276],
  [277],
] as const;
