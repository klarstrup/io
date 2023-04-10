import { dbFetch } from "./fetch";
import {
  PointsScore,
  SCORING_SOURCE,
  SCORING_SYSTEM,
  Score,
  ThousandDivideByScore,
  TopsAndZonesScore,
} from "./lib";
import { percentile } from "./utils";

export namespace Climbalong {
  export interface Athlete {
    athleteId: number;
    competitionId: number;
    bib: number;
    name: string;
    dateOfBirth: null;
    sex: Sex;
    category: null;
    nationality: null;
    club: null;
    tags: Tags;
  }

  export enum Sex {
    F = "F",
    M = "M",
  }

  export interface Tags {}

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
  export interface Circuit {
    competitionId: number;
    circuitId: number;
    title: string;
  }
}
enum HoldScore {
  "TOP" = 4,
  "ZONE" = 1,
}

const fetchClimbalong = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit
) => dbFetch<T>(`https://comp.climbalong.com/api${input}`, init);

const getCompetition = (id: number) =>
  fetchClimbalong<Climbalong.Competition>(`/v0/competitions/${id}`);
const getCompetitionAthletes = (id: number) =>
  fetchClimbalong<Climbalong.Athlete[]>(`/v0/competitions/${id}/athletes`);
const getCompetitionRounds = (id: number) =>
  fetchClimbalong<Climbalong.Round[]>(`/v1/competitions/${id}/rounds`);
const getCompetitionLanes = (id: number) =>
  fetchClimbalong<Climbalong.Lane[]>(`/v1/competitions/${id}/lanes`);

const getLaneCircuits = (id: number) =>
  fetchClimbalong<Climbalong.Circuit[]>(`/v0/lanes/${id}/circuits`);
const getLanesCircuits = (ids: number[]) =>
  Promise.all(ids.map((id) => getLaneCircuits(id)));

const getCircuitPerformances = (id: number) =>
  fetchClimbalong<Climbalong.Performance[]>(`/v0/circuits/${id}/performances`);
const getCircuitsPerformances = (ids: number[]) =>
  Promise.all(ids.map((id) => getCircuitPerformances(id)));

const getCircuitProblems = (id: number) =>
  fetchClimbalong<Climbalong.Problem[]>(`/v0/circuits/${id}/problems`);
const getCircuitsProblems = (ids: number[]) =>
  Promise.all(ids.map((id) => getCircuitProblems(id)));

const TDB_BASE = 1000;
const TDB_FLASH_MULTIPLIER = 1.1;
const PTS_SEND = 100;
const PTS_FLASH_BONUS = 20;

export async function getIoPercentileForClimbalongCompetition(
  competitionId: number,
  ioId?: number,
  sex?: boolean
) {
  let athletes = await getCompetitionAthletes(competitionId);

  const io =
    athletes.find(({ athleteId, name }) =>
      ioId ? athleteId === ioId : name.startsWith("Io ") || name === "Io"
    ) ?? null;

  if (io && sex) {
    athletes = athletes.filter((athlete) => athlete.sex === io.sex);
  }

  const rounds = (await getCompetitionRounds(competitionId)).filter(
    ({ title }) => !title.match(/final/gi) // Only score quals
  );
  const lanes = (await getCompetitionLanes(competitionId)).filter((lane) =>
    rounds.some(({ roundId }) => lane.roundId === roundId)
  );
  const circuits = (
    await getLanesCircuits(lanes.map(({ laneId }) => laneId))
  ).flat();
  const performances = (
    await getCircuitsPerformances(circuits.map(({ circuitId }) => circuitId))
  ).flat();
  const problems = (
    await getCircuitsProblems(circuits.map(({ circuitId }) => circuitId))
  ).flat();

  const [topsByProblemTitle, zonesByProblemTitle] = performances.reduce(
    ([topMemo, zoneMemo], performance) => {
      if (
        athletes.some((athlete) => athlete.athleteId === performance.athleteId)
      ) {
        const problem = problems.find(
          (p) => p.problemId === performance.problemId
        )!;
        for (const score of performance.scores) {
          if (score.holdScore === HoldScore["ZONE"]) {
            zoneMemo.set(problem.title, (zoneMemo.get(problem.title) || 0) + 1);
          }
          if (score.holdScore === HoldScore["TOP"]) {
            topMemo.set(problem.title, (topMemo.get(problem.title) || 0) + 1);
          }
        }
      }
      return [topMemo, zoneMemo];
    },
    [new Map<string, number>(), new Map<string, number>()]
  );

  const atheletesWithResults = athletes.map((athlete) => {
    let topsTDBScore = 0;
    let zonesTDBScore = 0;
    let topsPTSScore = 0;
    let tops = 0;
    let zones = 0;
    let topsAttempts = 0;
    let zonesAttempts = 0;

    const athletePerformances = performances.filter(
      (performance) => performance.athleteId === athlete.athleteId
    );
    for (const performance of athletePerformances) {
      const problem = problems.find(
        (p) => p.problemId === performance.problemId
      )!;
      let problemTopTDBScore =
        TDB_BASE / (topsByProblemTitle.get(problem.title) || 0);
      let problemZoneTDBScore =
        TDB_BASE / (zonesByProblemTitle.get(problem.title) || 0);

      for (const score of performance.scores) {
        if (score.holdScore === HoldScore["TOP"]) {
          topsAttempts += score.reachedInAttempt;
          tops += 1;
          topsPTSScore += PTS_SEND;
          if (score.reachedInAttempt === 1) {
            topsPTSScore += PTS_FLASH_BONUS;
            problemTopTDBScore *= TDB_FLASH_MULTIPLIER;
          }
          topsTDBScore += problemTopTDBScore;
        } else if (score.holdScore === HoldScore["ZONE"]) {
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
      topsPTSScore,
      topsTDBScore,
      zonesTDBScore,
      tops,
      zones,
      topsAttempts,
      zonesAttempts,
    } as const;
  });
  const atheletesInOrderOfTDBScore = Array.from(atheletesWithResults)
    .sort((a, b) => b.zonesTDBScore - a.zonesTDBScore)
    .sort((a, b) => b.topsTDBScore - a.topsTDBScore)
    .map(({ athlete }) => athlete);
  const atheletesInOrderOfPTSScore = Array.from(atheletesWithResults)
    .sort((a, b) => b.topsPTSScore - a.topsPTSScore)
    .map(({ athlete }) => athlete);
  const atheletesInOrderOfTopsAndZones = Array.from(atheletesWithResults)
    .sort((a, b) => a.zonesAttempts - b.zonesAttempts)
    .sort((a, b) => a.topsAttempts - b.topsAttempts)
    .sort((a, b) => b.zones - a.zones)
    .sort((a, b) => b.tops - a.tops)
    .map(({ athlete }) => athlete);

  const ioTopsAndZonesRank =
    io && atheletesInOrderOfTopsAndZones.indexOf(io) + 1;
  const ioTDBRank = io && atheletesInOrderOfTDBScore.indexOf(io) + 1;
  const ioPointsRank = io && atheletesInOrderOfPTSScore.indexOf(io) + 1;

  const ioPerformanceSum =
    io &&
    (
      await Promise.all(
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
                  holdScore: number;
                  totalNumberOfTimesReached: number;
                  totalNumberOfAttemptsUsed: number;
                }[];
              } | null;
            }[];
            ranked: boolean;
            processedBy: { nodeId: number; nodeType: number; edge: number }[];
          }>(
            `https://comp.climbalong.com/api/v0/nodes/${lane.endNodeId}/edges/${lane.endEdgeId}`
          )
        )
      )
    )
      .map(({ athletes }) => athletes)
      .flat()
      .find(({ athleteId }) => athleteId === io.athleteId)?.performanceSum;

  const circuitChallengeNodesGroupedByLane = await dbFetch<
    [
      number,
      {
        nodeId: number;
        nodeType: number;
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
      }[]
    ][]
  >(
    `https://comp.climbalong.com/api/v1/competitions/${competitionId}/circuitchallengenodesgroupedbylane`
  );

  const competition = await getCompetition(competitionId);
  const noProblems = new Set(problems.map(({ title }) => title)).size || NaN;
  const noClimbers = atheletesWithResults.length || NaN;

  const ioResults =
    (io &&
      atheletesWithResults.find(
        ({ athlete }) => athlete.athleteId === io.athleteId
      )) ??
    null;

  const ioPerformances =
    io && performances.filter(({ athleteId }) => athleteId === io.athleteId);

  let firstPerformance: Date | null = null;
  let lastPerformance: Date | null = null;
  for (const performance of ioPerformances || []) {
    const start = new Date(performance.performanceStartedTime);
    if (!firstPerformance || start < firstPerformance) {
      firstPerformance = start;
    }
    const end = new Date(
      performance.performanceEndedTime || performance.registrationTime
    );
    if (!lastPerformance || end > lastPerformance) {
      lastPerformance = end;
    }
  }

  return {
    start: new Date(
      firstPerformance ||
        circuitChallengeNodesGroupedByLane.find(
          ([, [challengeNode]]) => challengeNode?.selfscoringOpen
        )?.[1][0]?.selfscoringOpen ||
        competition.startTime
    ),
    end: new Date(
      lastPerformance ||
        circuitChallengeNodesGroupedByLane.find(
          ([, [challengeNode]]) => challengeNode?.selfscoringClose
        )?.[1][0]?.selfscoringClose ||
        competition.endTime
    ),
    venue: competition.facility.trim(),
    event: competition.title.trim(),
    category: io && sex ? io.sex : null,
    noParticipants: noClimbers,
    problems: noProblems,
    problemByProblem: problems.length
      ? Array.from(
          problems
            .reduce(
              (memo, problem) => {
                const ioPerformance = ioPerformances?.find(
                  ({ problemId }) => problemId === problem.problemId
                );

                // More nastiness here because each problem is repeated for each lane
                memo.set(problem.title, {
                  number: problem.title,
                  zone: Boolean(
                    ioPerformance?.scores.some(
                      (score) => score.holdScore === HoldScore["ZONE"]
                    ) || memo.get(problem.title)?.zone
                  ),
                  top: Boolean(
                    ioPerformance?.scores.some(
                      (score) => score.holdScore === HoldScore["TOP"]
                    ) || memo.get(problem.title)?.top
                  ),
                  flash: Boolean(
                    ioPerformance?.scores.some(
                      (score) =>
                        score.holdScore === HoldScore["TOP"] &&
                        score.reachedInAttempt === 1
                    ) || memo.get(problem.title)?.flash
                  ),
                });

                return memo;
              },
              new Map<
                string,
                {
                  number: string | undefined;
                  zone: boolean;
                  top: boolean;
                  flash: boolean;
                }
              >()
            )
            .values()
        )
      : null,

    scores: [
      ioPerformanceSum &&
        ({
          system: SCORING_SYSTEM["TOPS_AND_ZONES"],
          source: SCORING_SOURCE["OFFICIAL"],
          rank: ioPerformanceSum.rank,
          percentile: percentile(ioPerformanceSum.rank, noClimbers),
          tops:
            ioPerformanceSum.scoreSums.find(
              (sum) => sum.holdScore === HoldScore.TOP
            )?.totalNumberOfTimesReached || NaN,
          zones:
            ioPerformanceSum.scoreSums.find(
              (sum) => sum.holdScore === HoldScore.ZONE
            )?.totalNumberOfTimesReached || NaN,
          topsAttempts:
            ioPerformanceSum.scoreSums.find(
              (sum) => sum.holdScore === HoldScore.TOP
            )?.totalNumberOfAttemptsUsed || NaN,
          zonesAttempts:
            ioPerformanceSum.scoreSums.find(
              (sum) => sum.holdScore === HoldScore.ZONE
            )?.totalNumberOfAttemptsUsed || NaN,
        } satisfies TopsAndZonesScore),
      ioResults && ioTopsAndZonesRank
        ? ({
            system: SCORING_SYSTEM["TOPS_AND_ZONES"],
            source: SCORING_SOURCE["DERIVED"],
            rank: ioTopsAndZonesRank,
            percentile: percentile(ioTopsAndZonesRank, noClimbers),
            tops: ioResults.tops,
            zones: ioResults.zones,
            topsAttempts: ioResults.topsAttempts,
            zonesAttempts: ioResults.zonesAttempts,
          } satisfies TopsAndZonesScore)
        : null,
      ioResults && ioTDBRank
        ? ({
            system: SCORING_SYSTEM["THOUSAND_DIVIDE_BY"],
            source: SCORING_SOURCE["DERIVED"],
            rank: ioTDBRank,
            percentile: percentile(ioTDBRank, noClimbers),
            points: Math.round(ioResults.topsTDBScore),
          } satisfies ThousandDivideByScore)
        : null,
      ioResults && ioPointsRank
        ? ({
            system: SCORING_SYSTEM["POINTS"],
            source: SCORING_SOURCE["DERIVED"],
            rank: ioPointsRank,
            percentile: percentile(ioPointsRank, noClimbers),
            points: ioResults.topsPTSScore,
          } satisfies PointsScore)
        : null,
    ].filter(Boolean) as Score[],
  } as const;
}
