import { isAfter } from "date-fns";
import { type EventDetails, EventSource } from "../lib";
import { SongkickEvents } from "./songkick.server";

export namespace Songkick {
  export interface Event {
    id: number;
    displayName: string;
    type: Type;
    uri: string;
    status: Status;
    popularity: number;
    start: End;
    performance: Performance[];
    ageRestriction: null | string;
    flaggedAsEnded?: boolean;
    venue: Venue;
    location: Location;
    end?: End;
    series?: Series;
  }

  export type End =
    | {
        date: `${string}-${string}-${string}`;
        time: null;
        datetime: null;
      }
    | {
        date: `${string}-${string}-${string}`;
        time: `${string}:${string}:${string}`;
        datetime: string;
      };

  export interface Location {
    city: string;
    lat: number;
    lng: number;
  }

  export interface Performance {
    id: number;
    displayName: string;
    billing: Billing;
    billingIndex: number;
    artist: MetroArea;
  }

  export interface MetroArea {
    id: number;
    displayName: string;
    uri: string;
    identifier?: Identifier[];
    country?: Series;
  }

  export interface Series {
    displayName: string;
  }

  export interface Identifier {
    mbid: string;
    href: string;
  }

  export enum Billing {
    Headline = "headline",
    Support = "support",
  }

  export enum Status {
    Ok = "ok",
  }

  export enum Type {
    Concert = "Concert",
    Festival = "Festival",
  }

  export interface Venue {
    id: number | null;
    displayName: string;
    uri: null | string;
    metroArea: MetroArea;
    lat: number | null;
    lng: number | null;
  }
}

export const getEvents = (artistId: number) =>
  SongkickEvents.find({
    "performance.artist.id": artistId,
  }).toArray();

const EXELERATE_ID = 6777179;
const ETHEREAL_KINGDOMS_ID = 9563419;

export async function getSongkickEvents(): Promise<EventDetails[]> {
  const events = (
    await Promise.all([
      getEvents(EXELERATE_ID),
      getEvents(ETHEREAL_KINGDOMS_ID).then((evts) =>
        evts.filter((event) =>
          isAfter(
            new Date(event.start.datetime || event.start.date),
            new Date(2021, 0),
          ),
        ),
      ),
    ])
  ).flat();

  return events.map(
    (event): EventDetails =>
      ({
        source: EventSource.Songkick,
        type: "performance",
        discipline: "metal",
        id: event.id,
        url: event.uri,
        eventName:
          event.series?.displayName?.replace(" - A Decade Of Noise", "") ??
          event.venue.displayName,
        location: event.venue.metroArea.displayName,
        venue:
          event.venue.displayName !== "Unknown venue"
            ? event.venue.displayName
            : null,
        team:
          event.performance.find(
            ({ artist }) =>
              artist.id === EXELERATE_ID || artist.id === ETHEREAL_KINGDOMS_ID,
          )?.displayName || null,
        start:
          event.id === 41027597
            ? new Date("2023-08-26T14:15:00.000Z")
            : event.id === 40830303
              ? new Date("2023-05-11T17:30:00.000Z")
              : new Date(event.start.datetime || event.start.date),
        end:
          event.id === 41027597
            ? new Date("2023-08-26T14:45:00.000Z")
            : event.id === 40830303
              ? new Date("2023-05-11T18:00:00.000Z")
              : new Date(
                  event.end?.datetime ||
                    event.end?.date ||
                    event.start.datetime ||
                    event.start.date,
                ),
      }) as const,
  );
}
