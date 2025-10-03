import * as cheerio from "cheerio";
import { auth } from "../../../auth";
import { SportsTiming } from "../../../sources/sportstiming";
import {
  SportstimingEvents,
  SportstimingFavorites,
} from "../../../sources/sportstiming.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { uniqueBy } from "../../../utils";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sportstimingHeaders: HeadersInit = {
  "x-requested-with": "XMLHttpRequest",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
};

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    const events = uniqueBy(
      (
        await Promise.all([
          fetch(
            "https://www.sportstiming.dk/General/EventList/SearchEvents?type=Coming&keyword=Nordic%20Race&maxResults=10000",
            {
              headers: {
                referer: "https://www.sportstiming.dk/events",
                ...sportstimingHeaders,
              },
            },
          )
            .then((r) => r.json() as Promise<{ Events: SportsTiming.Event[] }>)
            .then(({ Events }) => Events),
          fetch(
            "https://www.sportstiming.dk/General/EventList/SearchEvents?type=Finished&keyword=Nordic%20Race&maxResults=10000",
            {
              headers: {
                referer: "https://www.sportstiming.dk/results",
                ...sportstimingHeaders,
              },
            },
          )
            .then((r) => r.json() as Promise<{ Events: SportsTiming.Event[] }>)
            .then(({ Events }) => Events),
        ])
      ).flat(),
      ({ EventId }) => EventId,
    );

    let updatedSportstimingEvents = false;
    for (const event of events) {
      const { upsertedCount, modifiedCount } =
        await SportstimingEvents.updateOne(
          { EventId: event.EventId },
          {
            $set: {
              ...event,
              RawDate: new Date(event.RawDate),
              EntryEndDate: new Date(event.EntryEndDate),
            },
          },
          { upsert: true },
        );

      updatedSportstimingEvents ||= upsertedCount > 0 || modifiedCount > 0;
    }

    yield* wrapSources(
      user,
      DataSource.Sportstiming,
      async function* ({ config: { name } }, setUpdated) {
        setUpdated(false);

        for (const event of events) {
          const liveSearchResultsURL = new URL(
            "https://www.sportstiming.dk/Results/ResultLiveSearch.aspx",
          );
          liveSearchResultsURL.searchParams.set("Rally", String(event.EventId));
          liveSearchResultsURL.searchParams.set("q", name);
          const liveSearchResultsText = await fetch(liveSearchResultsURL, {
            headers: { ...sportstimingHeaders },
          }).then((r) => r.text());

          for (const line of liveSearchResultsText.split("\n")) {
            const [, id] = line.split("|").map((s) => s.trim());
            if (!id || !Number(id)) continue;

            const favorite = (
              await fetch(
                `https://www.sportstiming.dk/event/${event.EventId}/favorites/UpdateFavorites`,
                {
                  headers: {
                    cookie: `cookies_allowed=required,statistics,settings; favorites_${event.EventId}=1_${id},`,
                    ...sportstimingHeaders,
                  },
                },
              ).then((r) => r.json() as Promise<SportsTiming.FavoriteUpdate[]>)
            ).find(({ Id }) => Id === Number(id));

            if (favorite) {
              const $ = cheerio.load(
                await fetch(
                  `https://www.sportstiming.dk/event/${event.EventId}/results/${favorite.Id}`,
                  { headers: { ...sportstimingHeaders } },
                ).then((r) => r.text()),
              );

              const distance =
                favorite?.TotalDistance ||
                $("td.splits-valuecol.splits-vertdivide")
                  .filter((_, e) => $(e).text().trim().endsWith(" km"))
                  .prev()
                  .filter((_, e) => $(e).text().trim() !== "Total")
                  .next()
                  .toArray()
                  .map(
                    (t) =>
                      Number($(t).text().replace(" km", "").replace(",", ".")) *
                      1000,
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
              const noParticipants = Number(
                $(".panel-primary td")
                  .filter((_, e) => $(e).text().trim() === "Mænd")
                  .first()
                  .next()
                  .text()
                  .split(" af ")[1],
              );

              const updateResult = await SportstimingFavorites.updateOne(
                { Id: favorite.Id },
                {
                  $set: {
                    ...favorite,
                    StartTime:
                      favorite.StartTime &&
                      new Date(Number(favorite.StartTime)),
                    LastSplitTimeOfDay:
                      favorite.LastSplitTimeOfDay &&
                      new Date(
                        Number(
                          String(favorite.LastSplitTimeOfDay).match(
                            /\/Date\((.+)\)\//,
                          )![1],
                        ),
                      ),
                    _io_NumberOfParticipants: noParticipants,
                    _io_TotalDistance: distance,
                    _io_EventId: event.EventId,
                  },
                },
                { upsert: true },
              );

              setUpdated(updatedSportstimingEvents || updateResult);

              yield favorite;
            }
          }

          yield event;
        }
      },
    );
  });
