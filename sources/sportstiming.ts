import * as cheerio from "cheerio";
import {
  addHours,
  addMinutes,
  addWeeks,
  isWithinInterval,
  subHours,
} from "date-fns";
import { dbFetch } from "../fetch";
import {
  DistanceRaceScore,
  EventEntry,
  EventSource,
  SCORING_SOURCE,
  SCORING_SYSTEM,
  Score,
} from "../lib";
import {
  DAY_IN_SECONDS,
  MINUTE_IN_SECONDS,
  WEEK_IN_SECONDS,
  cotemporality,
  percentile,
} from "../utils";

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

const sportstimingHeaders: HeadersInit = {
  "x-requested-with": "XMLHttpRequest",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
};
const getAllNordicRaceEvents = async () =>
  (
    await Promise.all([
      dbFetch<{ Events: SportsTiming.Event[] }>(
        "https://www.sportstiming.dk/General/EventList/SearchEvents?type=Coming&keyword=Nordic%20Race&maxResults=100&page=1&federation=",
        {
          headers: {
            referer: "https://www.sportstiming.dk/events",
            ...sportstimingHeaders,
          },
        },
        { maxAge: WEEK_IN_SECONDS },
      ).then(({ Events }) => Events),
      dbFetch<{ Events: SportsTiming.Event[] }>(
        "https://www.sportstiming.dk/General/EventList/SearchEvents?type=Finished&keyword=Nordic%20Race&maxResults=100&page=1&federation=",
        {
          headers: {
            referer: "https://www.sportstiming.dk/results",
            ...sportstimingHeaders,
          },
        },
        { maxAge: WEEK_IN_SECONDS },
      ).then(({ Events }) => Events),
    ])
  ).flat();

const getEventParticipantFavoriteUpdate = async (
  eventId: number,
  participantId: number,
  dbFetchOptions?: Parameters<typeof dbFetch>[2],
) => {
  const cookie = `cookies_allowed=required,statistics,settings; favorites_${eventId}=1_${participantId},`;

  return (
    await dbFetch<SportsTiming.FavoriteUpdate[]>(
      `https://www.sportstiming.dk/event/${eventId}/favorites/UpdateFavorites`,
      { headers: { cookie, ...sportstimingHeaders } },
      dbFetchOptions,
    )
  ).find(({ Id }) => Id === participantId);
};

export async function getSportsTimingEventResults(
  eventId: number,
  ioId: number,
  sex?: boolean,
) {
  const allNordicRaceEvents = await getAllNordicRaceEvents();

  const event = allNordicRaceEvents.find((Event) => Event.EventId === eventId);
  if (!event) throw new Error("???");

  const start = addMinutes(addHours(new Date(event.RawDate), 8), 30);
  const end = addHours(new Date(event.RawDate), 16);
  const competitionTime = cotemporality({ start, end });

  const maxAge: NonNullable<Parameters<typeof dbFetch>[2]>["maxAge"] =
    competitionTime === "current"
      ? 30
      : isWithinInterval(new Date(), {
            start: subHours(start, 3),
            end: addHours(end, 1),
          })
        ? MINUTE_IN_SECONDS
        : competitionTime === "past"
          ? isWithinInterval(new Date(), { start, end: addWeeks(end, 1) })
            ? DAY_IN_SECONDS
            : undefined
          : WEEK_IN_SECONDS;

  const ioResult = await getEventParticipantFavoriteUpdate(eventId, ioId, {
    maxAge,
  });

  const $ = cheerio.load(
    await dbFetch(
      `https://www.sportstiming.dk/event/${eventId}/results/${ioId}`,
      { headers: { ...sportstimingHeaders } },
      { parseJson: false, maxAge },
    ),
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
        (t) => Number($(t).text().replace(" km", "").replace(",", ".")) * 1000,
      )
      .reduce((sum, value) => sum + value, 0) ||
    Number(
      $(".panel-primary td")
        .filter((_, e) => $(e).text().trim() === "Distance")
        .last()
        .next()
        .text()
        .trim()
        .replace(" km", "")
        .replace(",", "."),
    ) * 1000 ||
    NaN;

  const duration =
    ioResult?.LastSplitTimeSeconds ||
    Number(
      $(".panel-primary td")
        .filter((_, e) => $(e).text().trim().startsWith("Nettotid"))
        .last()
        .next()
        .text()
        .trim()
        .split(":")
        .reverse()
        .reduce((seconds, unit, i) => {
          const n = Number(unit);
          return (
            seconds +
            (i === 0 ? n : i === 1 ? n * 60 : i === 2 ? n * 60 * 60 : 0)
          );
        }, 0),
    ) ||
    NaN;

  const scores: Score[] = [];
  if (rank) {
    scores.push({
      system: SCORING_SYSTEM.DISTANCE_RACE,
      source: SCORING_SOURCE.OFFICIAL,
      rank: rank || NaN,
      percentile: percentile(rank, noParticipants),
      duration,
      distance,
    } satisfies DistanceRaceScore);
  }

  return {
    source: "sportstiming",
    type: "competition",
    discipline: "running",
    id: eventId,
    ioId,
    url: `https://www.sportstiming.dk/event/${eventId}/results/${ioId}`,
    event: event.Name.replace("Copenhagen Urban", "")
      .replace("Copenhagen Beach", "")
      .replace("Refshaleøen", "")
      .replace("Strandparken", ""),
    subEvent: null,
    venue:
      event.Location?.replace("Copenhagen Beach", "Amager Strandpark")
        .replace("Copenhagen Urban", "Refshaleøen")
        .replace("Refshaleøen, København", "Refshaleøen")
        .replace("København S", "Amager Strandpark") ||
      (event.Name.includes("Strandparken") && "Amager Strandpark") ||
      null,
    location: null,
    team:
      eventId === 11107
        ? "L"
        : eventId === 8962
          ? "Tjek"
          : eventId === 8940
            ? "E & L & S"
            : eventId === 7913
              ? "S"
              : eventId === 5805
                ? "E & L & C & J"
                : eventId === 5647
                  ? "E & J"
                  : eventId === 4923
                    ? "Tjek"
                    : eventId === 12920
                      ? "S"
                      : null,
    noParticipants,
    start:
      ioResult?.StartTime && ioResult.StartTime > 0
        ? new Date(ioResult.StartTime)
        : addMinutes(addHours(new Date(event.RawDate), 8), 30),
    end:
      ioResult?.StartTime && ioResult.StartTime > 0
        ? new Date(ioResult.StartTime + duration * 1000)
        : addHours(new Date(event.RawDate), 16),
    category:
      bracket
        .replace("Strandparken 2018", "Open Race")
        .replace("Refshaleøen ", "")
        .replace("Strandparken ", "") + (sex ? " (M)" : " "),
    scores,
    problems: null,
    problemByProblem: null,
  } as const;
}

export async function getSportsTimingEventEntry(
  eventId: number,
  ioId: number,
): Promise<EventEntry> {
  const allNordicRaceEvents = await getAllNordicRaceEvents();

  const event = allNordicRaceEvents.find((Event) => Event.EventId === eventId);
  if (!event) throw new Error("???");

  return {
    source: EventSource.Sportstiming,
    type: "competition",
    discipline: "running",
    id: eventId,
    event: event.Name.replace("Copenhagen Urban", "")
      .replace("Copenhagen Beach", "")
      .replace("Refshaleøen", "")
      .replace("Strandparken", "")
      .replace("  ", " "),
    subEvent: null,
    venue:
      event.Location?.replace("Copenhagen Beach", "Amager Strandpark")
        .replace("Copenhagen Urban", "Refshaleøen")
        .replace("Refshaleøen, København", "Refshaleøen")
        .replace("København S", "Amager Strandpark") ||
      (event.Name.includes("Strandparken") && "Amager Strandpark") ||
      null,
    location: null,
    ioId,
    start: addMinutes(addHours(new Date(event.RawDate), 8), 30),
    end: addHours(new Date(event.RawDate), 16),
  } as const;
}

export const ioSportsTimingEventsWithIds = [
  [12920, 6076514],
  [12576, 5298030],
  [11107, 5177996],
  [10694, 5096890],
  [8962, 4433356],
  [8940, 3999953],
  [7913, 3825124],
  [5805, 2697593],
  [5647, 2619935],
  [4923, 2047175],
] as const;
