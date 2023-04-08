import { dbFetch } from "./fetch";

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

const BASE_PROBLEM_SCORE = 1000;
const FLASH_SCORE_MULTIPLIER = 1.1;
export async function getIoPercentileForClimbalongCompetition(
  competitionId: number,
  ioId?: number,
  sex?: boolean
) {
  let athletes = await getCompetitionAthletes(competitionId);

  const io = athletes.find(({ athleteId, name }) =>
    ioId ? athleteId === ioId : name.startsWith("Io ") || name === "Io"
  );

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

  const atheleteTopsByProblemId = performances.reduce((memo, performance) => {
    if (
      !athletes.some((athlete) => athlete.athleteId === performance.athleteId)
    )
      return memo;
    const problem = problems.find(
      (p) => p.problemId === performance.problemId
    )!;
    const topPerformances = memo.get(problem.title) || [];
    if (
      performance.scores.some(({ holdScore }) => holdScore === HoldScore["TOP"])
    )
      memo.set(problem.title, [...topPerformances, performance]);
    return memo;
  }, new Map<string, Climbalong.Performance[]>());
  const atheleteZonesByProblemId = performances.reduce((memo, performance) => {
    const problem = problems.find(
      (p) => p.problemId === performance.problemId
    )!;
    const zonePerformances = memo.get(problem.title) || [];
    if (
      performance.scores.some(
        ({ holdScore }) => holdScore === HoldScore["ZONE"]
      )
    )
      memo.set(problem.title, [...zonePerformances, performance]);
    return memo;
  }, new Map<string, Climbalong.Performance[]>());

  const atheletesWithTopAndZoneScores = athletes
    .map((athlete) => {
      let topScore = 0;
      let zoneScore = 0;

      for (const performance of performances.filter(
        (performance) => performance.athleteId === athlete.athleteId
      )) {
        const problem = problems.find(
          (p) => p.problemId === performance.problemId
        )!;

        if (
          performance.scores.some(
            ({ holdScore }) => holdScore === HoldScore["TOP"]
          )
        ) {
          let problemScore =
            BASE_PROBLEM_SCORE /
            atheleteTopsByProblemId.get(problem.title)!.length;
          if (
            performance.scores.some(
              ({ holdScore, reachedInAttempt }) =>
                holdScore === HoldScore["TOP"] && reachedInAttempt === 1
            )
          ) {
            problemScore *= FLASH_SCORE_MULTIPLIER;
          }
          topScore += problemScore;
        }
        if (
          performance.scores.some(
            ({ holdScore }) => holdScore === HoldScore["ZONE"]
          )
        ) {
          let problemScore =
            BASE_PROBLEM_SCORE /
            atheleteZonesByProblemId.get(problem.title)!.length;
          if (
            performance.scores.some(
              ({ holdScore, reachedInAttempt }) =>
                holdScore === HoldScore["ZONE"] && reachedInAttempt === 1
            )
          ) {
            problemScore *= FLASH_SCORE_MULTIPLIER;
          }
          zoneScore += problemScore;
        }
      }

      return [athlete, topScore, zoneScore] as const;
    })
    .sort(([, , zoneScoreA], [, , zoneScoreB]) => zoneScoreB - zoneScoreA)
    .sort(([, topScoreA], [, topScoreB]) => topScoreB - topScoreA)
    .map(
      ([athlete, topScore, zoneScore]) =>
        [athlete, topScore, zoneScore] as const
    );

  const ioTopScore =
    atheletesWithTopAndZoneScores.find(
      ([athlete]) => athlete.athleteId === io?.athleteId
    )?.[1] || NaN;

  const ioPercentile = ioTopScore
    ? atheletesWithTopAndZoneScores.filter(
        ([, topScore]) => topScore < ioTopScore
      ).length / atheletesWithTopAndZoneScores.length
    : NaN;
  const ioPercentileString = (ioPercentile * 100).toFixed(1) + "%";

  const competition = await getCompetition(competitionId);

  return {
    event: `${competition.facility} ${competition.title}${
      sex ? ` (${sex})` : ""
    }`,
    ioPercentile: `${ioPercentileString} (of ${
      atheletesWithTopAndZoneScores.length || NaN
    })`,
  };
}
