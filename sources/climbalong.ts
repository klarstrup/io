import { isAfter, isBefore, isFuture, max, min } from "date-fns";
import {
  type EventDetails,
  type EventEntry,
  EventSource,
  type PP,
  type PointsScore,
  SCORING_SOURCE,
  SCORING_SYSTEM,
  type Score,
  type TopsAndZonesScore,
} from "../lib";
import { percentile, unique } from "../utils";
import {
  ClimbAlongAthletes,
  ClimbAlongCircuits,
  ClimbAlongCompetitions,
  ClimbAlongEdges,
  ClimbAlongHolds,
  ClimbAlongLanes,
  ClimbAlongNodes,
  ClimbAlongPerformances,
  ClimbAlongProblems,
} from "./climbalong.server";

export namespace Climbalong {
  export enum ScoreSystem {
    BoulderTopAndZones = "BOULDER_TOP_AND_ZONES",
    BoulderOlympic = "BOULDER_OLYMPIC",
    LeadScorePerHold = "LEAD_SCORE_PER_HOLD",
    LeadScorePerHoldPlus = "LEAD_SCORE_PER_HOLD_PLUS",
    Unknown = "UNKNOWN",
  }

  export type CircuitChallengeNode = {
    nodeId: number;
    nodeType:
      | NodeType.CircuitChallenge
      | NodeType.CircuitChallenge3
      | NodeType.CircuitChallenge9;
    competitionId: number;
    inputsFrom: {
      nodeId: number;
      edgeId: number;
    }[];
    outputEdgeIds: number[];
    inputTitle: string;
    nodeOutputType: {
      scoreSystem: ScoreSystem;
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
  };

  export type Node = CircuitChallengeNode;

  export interface CircuitChallengeEdge {
    node: string;
    title: string;
    athletes: {
      athleteId: number;
      performanceSum: {
        athleteId: number;
        rank: number;
        scoreSums: {
          holdScore: number;
          totalNumberOfTimesReached: number;
          totalNumberOfAttemptsUsed: number;
          points?: number;
          problemId?: number;
        }[];
        prevRank: null;
        points?: number;
        origin?: null;
      };
    }[];
    ranked: boolean;
    processedBy: { nodeId: number; nodeType: number; edge: number }[];
  }

  export type Edge = CircuitChallengeEdge;

  export type CircuitChallengeNodesGroupedByLane = [
    number,
    CircuitChallengeNode[],
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
    holdScore: number;
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
  export interface Hold {
    holdId: number;
    problemId: number;
    label: string;
    holdScore: number;
    climbAlongHoldId: string;
    wkt: null | string;
  }
  export interface Circuit {
    competitionId: number;
    circuitId: number;
    title: string;
  }

  export enum NodeType {
    Entrance = 1,
    Splitter = 101,
    Sequencer = 201,
    CustomOrderSequencer = 202,
    CircuitChallenge = 301, // BOULDER_TOP_AND_ZONES
    CircuitChallenge3 = 304, // LEAD_SCORE_PER_HOLD_PLUS
    CircuitChallenge9 = 309, // BOULDER_OLYMPIC
    Gate = 401,
    Tiebreaker = 601,
    TimeTiebreaker = 602,
    ReRanker = 701,
  }
}

const isTop = (score: Climbalong.Score, holds: Climbalong.Hold[]) => {
  const problemId = holds.find(
    (hold) => hold.holdId === score.holdId,
  )?.problemId;
  const sortedHolds = holds
    .filter((hold) => hold.problemId === problemId)
    .sort((a, b) => b.holdScore - a.holdScore);

  return score.holdId === sortedHolds[0]?.holdId;
};

const isZone = (score: Climbalong.Score, holds: Climbalong.Hold[]) => {
  const problemId = holds.find(
    (hold) => hold.holdId === score.holdId,
  )?.problemId;
  const sortedHolds = holds
    .filter((hold) => hold.problemId === problemId)
    .sort((a, b) => b.holdScore - a.holdScore);

  return sortedHolds.slice(1).some((hold) => hold.holdId === score.holdId);
};

export async function getIoClimbAlongCompetitionEvent(
  competitionId: number,
  athleteId: number,
): Promise<EventDetails> {
  const competition = await ClimbAlongCompetitions.findOne({ competitionId });
  if (!competition) throw new Error("???");

  await Promise.all([
    ClimbAlongAthletes.createIndexes([{ key: { competitionId: 1 } }]),
    ClimbAlongCircuits.createIndexes([{ key: { competitionId: 1 } }]),
    ClimbAlongPerformances.createIndexes([{ key: { circuitId: 1 } }]),
    ClimbAlongProblems.createIndexes([{ key: { circuitId: 1 } }]),
    ClimbAlongNodes.createIndexes([{ key: { "circuit.circuitId": 1 } }]),
    ClimbAlongEdges.createIndexes([
      { key: { "processedBy.nodeId": 1, "processedBy.edge": 1 } },
    ]),
  ]);

  const [athletes, circuits, lanes] = await Promise.all([
    ClimbAlongAthletes.find({ competitionId }).toArray(),
    ClimbAlongCircuits.find({ competitionId }).toArray(),
    ClimbAlongLanes.find({ competitionId }).toArray(),
  ]);
  const [performances, problems] = await Promise.all([
    ClimbAlongPerformances.find({
      circuitId: { $in: circuits.map(({ circuitId }) => circuitId) },
    }).toArray(),
    ClimbAlongProblems.find({
      circuitId: { $in: circuits.map(({ circuitId }) => circuitId) },
    }).toArray(),
  ]);

  const io = athletes.find((athlete) => athlete.athleteId === athleteId);
  const ioPerformances =
    io && performances.filter(({ athleteId }) => athleteId === io.athleteId);

  const ioCircuitIds = ioPerformances
    ? unique(ioPerformances.map(({ circuitId }) => circuitId))
    : [];
  const [ioCircuitChallengeNode, holds] = await Promise.all([
    ClimbAlongNodes.findOne({
      "circuit.circuitId": { $in: ioCircuitIds },
    }),
    ClimbAlongHolds.find({
      problemId: { $in: problems.map(({ problemId }) => problemId) },
    })
      .toArray()
      .then((holds) =>
        // Exclude zero-score holds(typically start holds unrelated to scoring)
        holds.filter((hold) => hold.holdScore > 0),
      ),
  ]);
  const circuitChallengeEdges = await ClimbAlongEdges.find({
    processedBy: {
      $elemMatch: {
        nodeId: ioCircuitChallengeNode?.nodeId,
        edge: ioCircuitChallengeNode?.outputEdgeIds[0],
      },
    },
  }).toArray();

  const noProblems = problems.filter(
    (problem) =>
      problem.circuitId === ioCircuitChallengeNode?.circuit.circuitId,
  ).length;

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

  const ioCircuitChallenge =
    io &&
    circuitChallengeEdges.find(({ athletes }) =>
      athletes.some((athlete) => athlete.athleteId === io?.athleteId),
    );

  const ioPerformanceSum = ioCircuitChallenge?.athletes.find(
    (athlete) => athlete.athleteId === io?.athleteId,
  )?.performanceSum;

  // Using max rank for percentile calculations because some athletes DNF or not rank (i.e. GDPR deletion)
  const maxRank = ioCircuitChallenge?.athletes.reduce(
    (max, athlete) =>
      athlete.performanceSum && athlete.performanceSum.rank > max
        ? athlete.performanceSum.rank
        : max,
    0,
  );

  const noParticipants = ioCircuitChallenge?.athletes?.length || NaN;

  const scores: Score[] = [];

  if (
    ioPerformanceSum &&
    ioCircuitChallengeNode?.nodeOutputType.scoreSystem ===
      Climbalong.ScoreSystem.BoulderTopAndZones
  ) {
    const descendingHolds = Array.from(holds).sort(
      (a, b) => b.holdScore - a.holdScore,
    );
    const topScore = descendingHolds[0]?.holdScore;
    const zoneScore = descendingHolds[descendingHolds.length - 1]?.holdScore;
    const topSums = ioPerformanceSum.scoreSums.filter(
      (sum) => sum.holdScore === topScore,
    );
    const zoneSums = ioPerformanceSum.scoreSums.filter(
      (sum) => sum.holdScore === zoneScore,
    );
    scores.push({
      system: SCORING_SYSTEM.TOPS_AND_ZONES,
      source: SCORING_SOURCE.OFFICIAL,
      rank: ioPerformanceSum.rank,
      percentile: percentile(ioPerformanceSum.rank, maxRank ?? noParticipants),
      tops: topSums.reduce(
        (total, sum) => total + sum.totalNumberOfTimesReached,
        0,
      ),
      zones: zoneSums.reduce(
        (total, sum) => total + sum.totalNumberOfTimesReached,
        0,
      ),
      topsAttempts: topSums.reduce(
        (total, sum) => total + sum.totalNumberOfAttemptsUsed,
        0,
      ),
      zonesAttempts: zoneSums.reduce(
        (total, sum) => total + sum.totalNumberOfAttemptsUsed,
        0,
      ),
    } satisfies TopsAndZonesScore);
  } else if (
    ioPerformanceSum &&
    ioCircuitChallengeNode?.nodeOutputType.scoreSystem ===
      Climbalong.ScoreSystem.BoulderOlympic
  ) {
    scores.push({
      system: SCORING_SYSTEM.POINTS,
      source: SCORING_SOURCE.OFFICIAL,
      rank: ioPerformanceSum.rank,
      percentile: percentile(ioPerformanceSum.rank, maxRank ?? noParticipants),
      points:
        typeof ioPerformanceSum.points === "number"
          ? Math.round(ioPerformanceSum.points * 10) / 10
          : NaN,
    } satisfies PointsScore);
  }

  let url = new URL(
    `https://climbalong.com/competitions/${competitionId}/info`,
  );
  if (performances.length) {
    url = new URL(
      `https://climbalong.com/competitions/${competitionId}/results`,
    );

    const ioLane =
      ioCircuitChallengeNode &&
      lanes.find((lane) => lane.endNodeId === ioCircuitChallengeNode.nodeId);

    if (ioLane) {
      url.searchParams.set("lane", String(ioLane.laneId));
      // The comp link is not round-specific.
      // EventDetails.rounds(defined below) may have more specific links in the future.
      // url.searchParams.set("round", String(ioLane.roundId));
    }
  }

  return {
    source: EventSource.ClimbAlong,
    type: "competition",
    discipline: "bouldering",
    id: competitionId,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
    ioId: io?.athleteId!,
    url: url.toString(),
    start: max(
      [
        firstPerformance && new Date(firstPerformance),
        ioCircuitChallengeNode?.selfscoringOpen &&
          new Date(ioCircuitChallengeNode?.selfscoringOpen),
        new Date(competition.startTime),
      ].filter(Boolean),
    ),
    end: isFuture(new Date(competition.endTime))
      ? new Date(competition.endTime)
      : min(
          [
            lastPerformance && new Date(lastPerformance),
            ioCircuitChallengeNode?.selfscoringClose &&
              new Date(ioCircuitChallengeNode?.selfscoringClose),
            new Date(competition.endTime),
          ].filter(Boolean),
        ),
    venue: competition.facility.trim(),
    eventName: competition.title.trim(),
    location: competition.address,
    rounds: [
      {
        id:
          ioCircuitChallengeNode?.circuit.circuitId ||
          competition.competitionId,
        category:
          ioCircuitChallenge?.title
            ?.replace("Mænd/", "")
            ?.replace("Male / ", "")
            ?.replace("Male", "Open") || null,
        noParticipants,
        problems: noProblems,
        problemByProblem: problems.length
          ? Array.from(
              problems
                .filter((problem) => ioCircuitIds.includes(problem.circuitId))
                .reduce((memo, problem) => {
                  const ioPerformance = ioPerformances?.find(
                    (performance) =>
                      performance.problemId === problem.problemId,
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
                    attemptCount: ioPerformance?.numberOfAttempts,
                    zone: Boolean(
                      ioPerformance?.scores.some((score) =>
                        isZone(score, holds),
                      ) || memo.get(key)?.zone,
                    ),
                    top: Boolean(
                      ioPerformance?.scores.some((score) =>
                        isTop(score, holds),
                      ) || memo.get(key)?.top,
                    ),
                    flash: Boolean(
                      ioPerformance?.scores.some(
                        (score) =>
                          isTop(score, holds) && score.reachedInAttempt === 1,
                      ) || memo.get(key)?.flash,
                    ),
                    repeat: false,
                  });

                  return memo;
                }, new Map<string, PP>())
                .values(),
            )
          : null,
        scores,
      },
    ],
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
    eventName: competition.title.trim(),
    location: competition.address,
    ioId: athleteId,
    start: new Date(competition.startTime),
    end: new Date(competition.endTime),
  } as const;
}
