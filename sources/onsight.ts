import {
  EventEntry,
  EventSource,
  Score,
  SCORING_SOURCE,
  SCORING_SYSTEM,
} from "../lib";
import { percentile } from "../utils";
import {
  OnsightCompetitions,
  OnsightCompetitionScores,
} from "./onsight.server";

export namespace Onsight {
  type CompetitionName = string;
  type CompetitionId = string;
  type TimeString = `${string}:${string}`;
  type DateString = `${string}-${string}-${string}`;

  export interface Competition {
    _id: string;
    Owner_name: string;
    Owner: string; // Email
    Category: string;
    Start: `${TimeString} - ${TimeString}`;
    Config: string;
    Routes: `${number}`;
    Date: DateString;
    Name: string;
    acl: ACL;
    _createdAt: Date;
    _updatedAt: Date;
  }

  export interface CompetitionScore {
    _id: string;
    Score: `${number}-${number}/${number}/${number}`;
    Routescore?: number[];
    Points?: number;
    Category?: Category[];
    Username: string; // Email
    Competition_name: `${CompetitionName}/${CompetitionId}`;
    Config?: Config;
    Gender: Gender;
    Ascents?: (
      | `${number}/${number}/${number}`
      | `${number}/${number}/${number}/${Category | "-"}`
    )[];
    Name: string;
    acl: ACL;
    _createdAt: Date;
    _updatedAt: Date;
  }

  export enum Category {
    Cat1 = "Cat. 1",
    Cat2 = "Cat. 2",
    Cat3 = "Cat. 3",
    Cat4 = "Cat. 4",
    Empty = "",
  }

  export enum Config {
    Boulder0 = "boulder/0",
    Boulder00 = "Boulder/0/ 0",
    Boulder01 = "Boulder/0/1",
    Boulder02 = "Boulder/0/2",
    Boulder03 = "Boulder/0/3",
    Boulder06 = "Boulder/0/6",
    Boulder1 = "boulder/1",
    Boulder10 = "Boulder/1/ 0",
    Boulder11 = "Boulder/1/1",
    Boulder13 = "Boulder/1/3",
    Boulder15 = "Boulder/1/5",
    Boulder16 = "Boulder/1/6",
    Boulder17 = "Boulder/1/7",
    Boulder25 = "Boulder/2/5",
    Boulder26 = "Boulder/2/6",
    Rope04 = "Rope/0/4",
    Rope05 = "Rope/0/5",
    Rope08 = "Rope/0/8",
    Rope1 = "rope/1",
    Rope16 = "Rope/1/6",
    Rope2 = "rope/2",
    Rope20 = "Rope/2/ 0",
    Rope21 = "Rope/2/1",
    Rope23 = "Rope/2/3",
    Rope25 = "Rope/2/5",
    Rope26 = "Rope/2/6",
  }

  export enum Gender {
    Female = "Female",
    Male = "Male",
  }

  export interface ACL {
    "*": {
      write: boolean;
      read: boolean;
    };
  }
}

export async function getIoOnsightCompetitionEvent(
  competitionId: string,
  Username: string,
) {
  const competition = await OnsightCompetitions.findOne({ _id: competitionId });

  if (!competition) throw new Error("???" + competitionId);

  const competitionScores = await OnsightCompetitionScores.find({
    Competition_name: `${competition.Name}/${competitionId}`,
  }).toArray();
  const ioCompetitionScore = competitionScores.find(
    (competitionScore) => competitionScore.Username === Username,
  );

  if (!ioCompetitionScore) {
    throw new Error("???" + `${competition.Name}/${competitionId}`);
  }

  const noParticipants = competitionScores.filter(
    (competitionScore) => competitionScore.Gender === ioCompetitionScore.Gender,
  ).length;
  const rank =
    competitionScores
      .filter(
        (competitionScore) =>
          competitionScore.Gender === ioCompetitionScore.Gender,
      )
      .sort((a, b) => b.Points! - a.Points!)
      .findIndex(
        (competitionScore) => competitionScore._id === ioCompetitionScore._id,
      ) + 1;

  return {
    source: "onsight",
    type: "competition",
    discipline: "bouldering",
    id: competitionId,
    ioId: ioCompetitionScore._id,
    url: "https://onsight.one/app/Onsight.html",
    start: competition.startAt,
    end: competition.endAt,
    venue: "Blocs & Walls",
    event: competition.Name,
    subEvent: competition.Name.includes("KVAL") ? "Qualification" : null,
    location: "Refshalevej 163D, 1432 København K",
    category: ioCompetitionScore.Gender[0],
    team: null,
    noParticipants,
    problems: Number(competition.Routes),
    problemByProblem: ioCompetitionScore.Ascents?.length
      ? Array.from(
          ioCompetitionScore.Ascents.map((ascent, index) => {
            const attemptsToTop = ascent.split("/")[0]!;
            const result = ascent.split("/")[2]!;

            return {
              number: index + 1,
              color: undefined,
              grade: undefined,
              attempt: Number(attemptsToTop) > 0,
              zone: result === "1",
              top: result === "2",
              flash: result === "2" && attemptsToTop === "1",
              repeat: false,
            };
          }),
        )
      : null,
    scores: [
      {
        source: SCORING_SOURCE.OFFICIAL,
        system: SCORING_SYSTEM.TOPS_AND_ZONES,
        tops: Number(ioCompetitionScore.Score.split("-")[1]!.split("/")[0]!),
        zones: Number(ioCompetitionScore.Score.split("-")[1]!.split("/")[2]!),
        topsAttempts: Number(
          ioCompetitionScore.Score.split("-")[1]!.split("/")[1]!,
        ),
        zonesAttempts: Number(
          ioCompetitionScore.Score.split("-")[1]!.split("/")[3]!,
        ),
        rank,
        percentile: percentile(rank, noParticipants),
      },
    ] satisfies Score[],
  } as const;
}

export async function getIoOnsightCompetitionEventEntries(
  Username: string,
): Promise<EventEntry[]> {
  const competitionScores = await OnsightCompetitionScores.find({
    Username,
  }).toArray();

  return await Promise.all(
    competitionScores.map(async (competitionScore) => {
      const competition = await OnsightCompetitions.findOne({
        _id: competitionScore.Competition_name.split("/")[1]!,
      });

      if (!competition) throw new Error("???");

      return {
        source: EventSource.Onsight,
        type: "competition",
        discipline: "bouldering",
        id: competitionScore.Competition_name.split("/")[1]!,
        venue: "Blocs & Walls",
        event: competitionScore.Competition_name.split("/")[0]!.trim(),
        subEvent: competitionScore.Competition_name.split("/")[0]!
          .trim()
          .includes("KVAL")
          ? "Qualification"
          : null,
        location: "Refshalevej 163D, 1432 København K",
        ioId: competitionScore.Username,
        start: competition.startAt,
        end: competition.endAt,
      } satisfies EventEntry;
    }),
  );
}
