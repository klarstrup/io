import { addHours, addMinutes } from "date-fns";
import {
  DistanceRaceScore,
  EventEntry,
  EventSource,
  SCORING_SOURCE,
  SCORING_SYSTEM,
  Score,
} from "../lib";
import { percentile } from "../utils";
import {
  SportstimingEvents,
  SportstimingFavorites,
} from "./sportstiming.server";

export namespace SportsTiming {
  export interface Event {
    EventId: number;
    Name: string;
    Date: string;
    RawDate: Date;
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
    EntryEndDate: Date;
  }

  export interface FavoriteUpdate {
    Id: number;
    Type: number;
    Position: number | null;
    FinishStatus: number;
    IsActive: boolean;
    StartTime: Date | null;
    LastSplitDistance: number;
    LastSplitName: LastSplitName;
    LastSplitTimeSeconds: number | null;
    MeterPerSeconds: number;
    KMPerHour: number;
    NextSplitDistance: number;
    NextSplitName: NextSplitName;
    NextSplitArrivalTime: string;
    TotalDistance: number;
    ArrivalTimeOfDay: string;
    Name: string;
    MarkerText: string;
    RaceNumber: null | string;
    LastSplitTimeOfDay: null | Date;
    GpsLatitude: null;
    GpsLongitude: null;
    MapCourseId: number;
    DistanceName: string;
  }
  export interface MongoFavoriteUpdate extends FavoriteUpdate {
    _io_TotalDistance: number;
    _io_NumberOfParticipants: number;
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

export async function getSportsTimingEventResults(
  eventId: number,
  ioId: number,
) {
  const event = await SportstimingEvents.findOne({ EventId: eventId });
  if (!event) throw new Error("???");

  const ioResult = await SportstimingFavorites.findOne({ Id: ioId });
  const rank = ioResult?.Position;
  const noParticipants = ioResult?._io_NumberOfParticipants || NaN;

  const distance = ioResult?._io_TotalDistance || NaN;
  const duration = ioResult?.LastSplitTimeSeconds || NaN;

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
    start: ioResult?.StartTime
      ? new Date(ioResult.StartTime)
      : addMinutes(addHours(new Date(event.RawDate), 8), 30),
    end: ioResult?.StartTime
      ? new Date(ioResult.StartTime.valueOf() + duration * 1000)
      : addHours(new Date(event.RawDate), 16),
    category:
      ioResult?.DistanceName.replace("Strandparken 2018", "Open Race")
        .replace("Refshaleøen ", "")
        .replace("Strandparken ", "") + " (M)",
    scores,
    problems: null,
    problemByProblem: null,
  } as const;
}

export async function getSportsTimingEventEntry(
  eventId: number,
  ioId: number,
): Promise<EventEntry> {
  const event = await SportstimingEvents.findOne({ EventId: eventId });
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
