import { TZDate } from "@date-fns/tz";
import { auth } from "../../../auth";
import { Songkick } from "../../../sources/songkick";
import { SongkickEvents } from "../../../sources/songkick.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { fetchJson, jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const fetchSongKick = async <T>(input: string | URL, init?: RequestInit) => {
  const url = new URL(input, "https://api.songkick.com/api/3.0/");
  url.searchParams.set("apikey", process.env.SONGKICK_APIKEY!);

  return fetchJson<T>(url, init);
};

const getFutureEvents = (artistId: number) =>
  fetchSongKick<{
    resultsPage: {
      status: string;
      results: { event: Songkick.Event[] };
      perPage: number;
      page: number;
      totalEntries: number;
    };
  }>(`artists/${artistId}/calendar.json`).then(({ resultsPage }) =>
    resultsPage.totalEntries ? resultsPage.results.event : [],
  );

const getPastEvents = (artistId: number) =>
  fetchSongKick<{
    resultsPage: {
      status: string;
      results: { event: Songkick.Event[] };
      perPage: number;
      page: number;
      totalEntries: number;
    };
  }>(`artists/${artistId}/gigography.json`).then(({ resultsPage }) =>
    resultsPage.totalEntries ? resultsPage.results.event : [],
  );

const dateStringToDate = (dateString: `${string}-${string}-${string}`) => {
  const [year, month, day] = dateString
    .split("-")
    .map((part) => parseInt(part, 10));

  return new TZDate(year!, month! - 1, day!, "Etc/UTC");
};

export const GET = () =>
  jsonStreamResponse(async function* () {
    if (!process.env.SONGKICK_APIKEY) {
      console.error("Missing SONGKICK_APIKEY");

      return new Response("Server misconfigured", { status: 500 });
    }

    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.Songkick,
      async function* ({ config: { artistId } }, setUpdated) {
        setUpdated(false);

        const [pastEvents, futureEvents] = await Promise.all([
          getPastEvents(artistId),
          getFutureEvents(artistId),
        ]);

        let updatedSongkickEvents = false;
        for (const event of [...pastEvents, ...futureEvents]) {
          const { upsertedCount, modifiedCount } =
            await SongkickEvents.updateOne(
              { id: event.id },
              {
                $set: {
                  ...event,
                  startDate: event.start.datetime
                    ? new TZDate(event.start.datetime, "Etc/UTC")
                    : dateStringToDate(event.start.date),
                  endDate:
                    event.end &&
                    (event.end.datetime
                      ? new TZDate(event.end.datetime, "Etc/UTC")
                      : dateStringToDate(event.end.date)),
                },
              },
              { upsert: true },
            );

          updatedSongkickEvents ||= upsertedCount > 0 || modifiedCount > 0;
          yield event;
        }

        const updateResult = pastEvents.length + futureEvents.length > 0;

        setUpdated(updatedSongkickEvents || updateResult);
      },
    );
  });
