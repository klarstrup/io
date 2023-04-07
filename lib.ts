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

enum HoldScore {
  "TOP" = 4,
  "ZONE" = 1,
}
const BASE_PROBLEM_SCORE = 1000;
const FLASH_SCORE_MULTIPLIER = 1.1;
const fetchCache = new Map<RequestInfo | URL, Promise<any>>();
const cachedFetchJSON = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> => {
  console.log(fetchCache.size);
  const key = JSON.stringify({ input, init });
  if (!fetchCache.has(key)) {
    const jsonPromise = fetch(input, init).then((r) => r.json());
    fetchCache.set(key, jsonPromise);
  }

  return fetchCache.get(key)!;
};
const fetchClimbalong = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit
) => cachedFetchJSON<T>(`https://comp.climbalong.com/api${input}`, init);

export async function getIoPercentileForClimbalongCompetition(
  competitionId: number,
  ioId?: number,
  sex?: Sex
) {
  const competition = await fetchClimbalong<Competition>(
    `/v0/competitions/${competitionId}`
  );

  const athletes = (
    await fetchClimbalong<Athlete[]>(
      `/v0/competitions/${competitionId}/athletes`
    )
  ).filter((athlete) => (sex ? athlete.sex === sex : true));

  const io = ioId
    ? athletes.find((athlete) => athlete.athleteId === ioId)
    : athletes.find(({ name }) => name.startsWith("Io ") || name === "Io");

  const rounds = (
    await fetchClimbalong<Round[]>(`/v1/competitions/${competitionId}/rounds`)
  ).filter((round) => !round.title.match(/final/gi)); // Only score quals
  const lanes = (
    await fetchClimbalong<Lane[]>(`/v1/competitions/${competitionId}/lanes`)
  ).filter((lane) => rounds.some((round) => lane.roundId === round.roundId));
  const circuits = (
    await Promise.all(
      lanes.map(({ laneId }) =>
        fetchClimbalong<Circuit[]>(`/v0/lanes/${laneId}/circuits`)
      )
    )
  ).flat();
  const performances = (
    await Promise.all(
      circuits.map(({ circuitId }) =>
        fetchClimbalong<Performance[]>(`/v0/circuits/${circuitId}/performances`)
      )
    )
  ).flat();
  const problems = (
    await Promise.all(
      circuits.map(({ circuitId }) =>
        fetchClimbalong<Problem[]>(`/v0/circuits/${circuitId}/problems`)
      )
    )
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
  }, new Map<string, Performance[]>());
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
  }, new Map<string, Performance[]>());

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

  const ioPercentile =
    atheletesWithTopAndZoneScores.filter(
      ([, topScore]) => topScore < ioTopScore
    ).length / atheletesWithTopAndZoneScores.length;
  const ioPercentileString = (ioPercentile * 100).toFixed(1) + "%";

  return {
    event: `${competition.facility} ${competition.title}${
      sex ? ` (${sex})` : ""
    }`,
    ioPercentile: `${ioPercentileString} (of ${
      atheletesWithTopAndZoneScores.length || NaN
    })`,
  };
}

/*
  Promise.all([
    getIoPercentileForClimbalongCompetition(13, 844, Sex["M"]),
    getIoPercentileForClimbalongCompetition(20, 1284, Sex["M"]),
    {
      event: `Beta Boulders Winter Pump Fest (Feb 4th) (M)`,
      ioPercentile: `62.4% (of 140)`,
    },
    getIoPercentileForClimbalongCompetition(26, 3381, Sex["M"]),
    {
      event: `Beta Boulders Gorilla Unleashed II (Apr 1st) (M)`,
      ioPercentile: `31.7% (of 115)`,
    },
    getIoPercentileForClimbalongCompetition(27, undefined, Sex["M"]),
  ]).then((a) => console.table(a), console.error);
  
  */
