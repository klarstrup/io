import * as cheerio from "cheerio";
import { dbFetch } from "./fetch";
import {
  DistanceRaceScore,
  SCORING_SOURCE,
  SCORING_SYSTEM,
  Score,
} from "./lib";
import { percentile } from "./utils";

export namespace SportsTiming {
  export interface Event {
    EventId: number;
    Name: string;
    Date: Date;
    RawDate: string;
    IsLiveResults: boolean;
    IsEntryOpen: boolean;
    IsEntryOpeningLater: boolean;
    EntryOpeningLaterText: null;
    EventType: number;
    EventTypeIcon: string;
    RegStatus: number;
    Priority: number;
    SecondaryButtonTitle: null;
    SecondaryButtonLink: null;
    EventTypeName: string;
    LinkEvent: string;
    LinkEventMain: null;
    LinkResults: string;
    LinkNewWindow: null;
    Location: null | string;
    LocationRegion: null;
    CustomText: null;
    HasResults: boolean;
    DcuRegion: null;
    IsSkoleOL: boolean;
    RegFlags: number;
    RegFlags2: number;
    EntryEndDate: string;
  }

  export interface FavoriteUpdate {
    Id: number;
    Position: number;
    StartTime: number;
    LastSplitDistance: number;
    LastSplitName: LastSplitName;
    LastSplitTimeSeconds: number;
    MeterPerSeconds: number;
    NextSplitDistance: number;
    NextSplitName: NextSplitName;
    NextSplitArrivalTime: string;
    TotalDistance: number;
    ArrivalTimeOfDay: string;
  }

  export enum LastSplitName {
    IkkeStartet = "Ikke startet",
    Mål = "Mål",
  }

  export enum NextSplitName {
    Dnf = "DNF",
    Empty = "",
  }
}

const parseSTDate = (stDate: string) =>
  new Date(Number(stDate.match(/\d+/)?.[0]));

const getAllNordicRaceEvents = async () =>
  (
    await Promise.all([
      dbFetch<{ Events: SportsTiming.Event[] }>(
        "https://www.sportstiming.dk/General/EventList/SearchEvents?type=Coming&keyword=Nordic%20Race"
      ).then(({ Events }) => Events),
      dbFetch<{ Events: SportsTiming.Event[] }>(
        "https://www.sportstiming.dk/General/EventList/SearchEvents?type=Finished&keyword=Nordic%20Race"
      ).then(({ Events }) => Events),
    ])
  ).flat();

const getEventParticipantFavoriteUpdate = async (
  eventId: number,
  participantId: number
) =>
  (
    await dbFetch<SportsTiming.FavoriteUpdate[]>(
      `https://www.sportstiming.dk/event/${eventId}/favorites/UpdateFavorites`,
      {
        headers: {
          cookie: `cookies_allowed=required,statistics,settings; favorites_${eventId}=1_${participantId},`,
        },
      }
    )
  ).find(({ Id }) => Id === participantId);

export async function getSportsTimingEventResults(
  eventId: number,
  ioId: number,
  sex?: boolean
) {
  const allNordicRaceEvents = await getAllNordicRaceEvents();

  const event = allNordicRaceEvents.find((Event) => Event.EventId === eventId)!;

  const ioResult = await getEventParticipantFavoriteUpdate(eventId, ioId);

  const $ = cheerio.load(
    await dbFetch(
      `https://www.sportstiming.dk/event/${eventId}/results/${ioId}`,
      undefined,
      { parseJson: false }
    )
  );

  const bracket = $(".panel-primary td")
    .filter((_, e) => $(e).text().trim() === "Distance")
    .first()
    .next()
    .text()
    .trim();

  const positionString = $(".panel-primary td")
    .filter((_, e) => $(e).text().trim() === (sex ? "Mænd" : "Samlet"))
    .first()
    .next()
    .text();
  const rank = Number(positionString.split(" af ")[0]);
  const noParticipants = Number(positionString.split(" af ")[1]);

  const distance =
    ioResult?.TotalDistance ||
    $("td.splits-valuecol.splits-vertdivide")
      .filter((_, e) => $(e).text().trim().endsWith(" km"))
      .prev()
      .filter((_, e) => $(e).text().trim() !== "Total")
      .next()
      .toArray()
      .map(
        (t) => Number($(t).text().replace(" km", "").replace(",", ".")) * 1000
      )
      .reduce((sum, value) => sum + value, 0) ||
    NaN;

  return {
    event:
      "🏃 " +
      event.Name.replace("Copenhagen Urban", "")
        .replace("Copenhagen Beach", "")
        .replace("Refshaleøen", "")
        .replace("Strandparken", ""),
    venue:
      event.Location?.replace("Copenhagen Beach", "Amager Strandpark")
        .replace("Copenhagen Urban", "Refshaleøen")
        .replace("Refshaleøen, København", "Refshaleøen")
        .replace("København S", "Amager Strandpark") ||
      (event.Name.includes("Strandparken") && "Amager Strandpark") ||
      null,
    noParticipants,
    start:
      ioResult?.StartTime && ioResult.StartTime > 0
        ? new Date(ioResult.StartTime)
        : parseSTDate(event.RawDate),
    end:
      ioResult?.StartTime && ioResult.StartTime > 0
        ? new Date(ioResult.StartTime + ioResult.LastSplitTimeSeconds * 1000)
        : parseSTDate(event.EntryEndDate),
    category:
      bracket
        .replace("Strandparken 2018", "Open Race")
        .replace("Refshaleøen ", "")
        .replace("Strandparken ", "") + (sex ? " (M)" : " "),
    scores: (rank
      ? [
          {
            system: SCORING_SYSTEM.DISTANCE_RACE,
            source: SCORING_SOURCE.OFFICIAL,
            rank: rank || NaN,
            percentile: percentile(rank, noParticipants),
            duration: ioResult?.LastSplitTimeSeconds || NaN,
            distance,
          } satisfies DistanceRaceScore,
        ]
      : []) as Score[],
    problems: null,
    problemByProblem: null,
  } as const;
}
