import { isAfter } from "date-fns";
import { dbFetch } from "../fetch";
import { Score } from "../lib";
import { DAY_IN_SECONDS } from "../utils";

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

  export interface End {
    date: Date;
    time: null | string;
    datetime: null | string;
  }

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

const fetchSongKick = async <T>(
  input: string | URL,
  init?: RequestInit,
  dbFetchOptions?: Parameters<typeof dbFetch>[2]
) => {
  const url = new URL(`https://api.songkick.com/api/3.0${String(input)}`);
  if (process.env.SONGKICK_APIKEY) {
    url.searchParams.set("apikey", process.env.SONGKICK_APIKEY);
  }
  return dbFetch<T>(url, init, dbFetchOptions);
};
const getFutureEvents = (artistId: number) =>
  fetchSongKick<{
    resultsPage: {
      status: string;
      results: {
        event: Songkick.Event[];
      };
      perPage: number;
      page: number;
      totalEntries: number;
    };
  }>(`/artists/${artistId}/calendar.json`, undefined, {
    maxAge: DAY_IN_SECONDS,
  }).then((response) =>
    response.resultsPage.totalEntries ? response.resultsPage.results.event : []
  );

const getPastEvents = (artistId: number) =>
  fetchSongKick<{
    resultsPage: {
      status: string;
      results: {
        event: Songkick.Event[];
      };
      perPage: number;
      page: number;
      totalEntries: number;
    };
  }>(`/artists/${artistId}/gigography.json`, undefined, {
    maxAge: DAY_IN_SECONDS,
  }).then((response) =>
    response.resultsPage.totalEntries ? response.resultsPage.results.event : []
  );

const EXELERATE_ID = 6777179;
const ETHEREAL_KINGDOMS_ID = 9563419;

export async function getSongkickEvents() {
  const events = [
    ...(await getPastEvents(EXELERATE_ID)),
    ...(await getFutureEvents(EXELERATE_ID)),
    ...(await getPastEvents(ETHEREAL_KINGDOMS_ID)).filter((event) =>
      isAfter(new Date(event.start.date), new Date(2021, 0))
    ),
    ...(await getFutureEvents(ETHEREAL_KINGDOMS_ID)),
  ];

  return events.map(
    (event) =>
      ({
        source: "songkick",
        type: "performance",
        discipline: "metal",
        id: event.id,
        url: event.uri,
        event:
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
              artist.id === EXELERATE_ID || artist.id === ETHEREAL_KINGDOMS_ID
          )?.displayName || null,
        noParticipants: null,
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
                  event.start.date
              ),
        category: null,
        scores: [] as Score[],
        problems: null,
        problemByProblem: null,
      } as const)
  );
}
