import { createHash } from "crypto";
import { isDate, subMilliseconds } from "date-fns";
import { auth } from "../../../auth";
import type { IcalIoMeta } from "../../../lib";
import { extractIcalCalendarAndEvents } from "../../../sources/ical";
import { IcalEvents } from "../../../sources/ical.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { parseICS } from "../../../vendor/ical";
import { fetchText, jsonStreamResponse } from "../scraper-utils";

export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.ICal,
      async function* ({ config: { url } }, setUpdated) {
        setUpdated(false);

        if (!url) throw new Error("No URL provided for iCal data source");

        await IcalEvents.createIndexes([
          { key: { _io_userId: 1, _io_icalUrlHash: 1, uid: 1 }, unique: true },
          { key: { _io_userId: 1, _io_icalUrlHash: 1, lastmodified: -1 } },
        ]);
        const icalUrlHash = createHash("sha256")
          .update(url + user.id)
          .digest("hex");
        const ioIcalMeta: IcalIoMeta = {
          _io_userId: user.id,
          _io_icalUrlHash: icalUrlHash,
          _io_source: DataSource.ICal,
        };
        const now0 = new Date();

        const [ics, existingEventIds, mostRecentlyModifiedEvent] =
          await Promise.all([
            fetchText(url),
            IcalEvents.find(ioIcalMeta, {
              projection: { _id: 1, uid: 1 },
            }).toArray(),
            IcalEvents.findOne(ioIcalMeta, {
              sort: { lastmodified: -1 },
              projection: { lastmodified: 1 },
            }),
          ]);
        const icalData = parseICS(ics);

        const _io_scrapedAt = new Date();
        const now1 = new Date();
        const { calendar, events } = extractIcalCalendarAndEvents(icalData);
        yield `Fetched ${events.length} events for icalUrlHash: ${icalUrlHash} in ${((new Date().getTime() - now1.getTime()) / 1000).toFixed(2)} seconds`;

        // This accounts for a situation where we ingest an empty or otherwise malformed iCal feed
        if (existingEventIds.length * 0.25 > events.length) {
          yield `Existing events count(${existingEventIds.length}) is much greater than new events count(${events.length}) for icalUrlHash: ${icalUrlHash}, skipping`;
          setUpdated(false);
          return;
        }

        //
        const eventsToDelete = existingEventIds.filter(
          (existingEvent) =>
            !events.some((event) => event.uid === existingEvent.uid),
        );

        const now2 = new Date();
        const deleteResult = await IcalEvents.deleteMany({
          ...ioIcalMeta,
          uid: { $in: eventsToDelete.map((event) => event.uid) },
        });
        setUpdated(deleteResult);
        yield `Deleted ${deleteResult.deletedCount} existing events for icalUrlHash: ${icalUrlHash} in ${((new Date().getTime() - now2.getTime()) / 1000).toFixed(2)} seconds`;

        yield `Most recently modified event for icalUrlHash: ${icalUrlHash} is ${String(mostRecentlyModifiedEvent?.lastmodified) || "none"}`;

        // Microsoft Exchange never sets the lastmodified property, so this optimization will not work for those feeds. We will always try to upsert all events for those feeds.
        const eventsUpdatedSinceMostRecentlyModifiedEvent = events.filter(
          (event) =>
            !mostRecentlyModifiedEvent?.lastmodified ||
            !event.lastmodified ||
            event.lastmodified > mostRecentlyModifiedEvent.lastmodified,
        );

        let upsertResult = {
          insertedCount: NaN,
          upsertedCount: NaN,
          matchedCount: NaN,
          modifiedCount: NaN,
        };
        if (eventsUpdatedSinceMostRecentlyModifiedEvent.length) {
          yield `Upserting ${eventsUpdatedSinceMostRecentlyModifiedEvent.length} events(of ${events.length} scraped) updated since most recently modified event for icalUrlHash: ${icalUrlHash}`;

          const now3 = new Date();
          upsertResult = await IcalEvents.bulkWrite(
            eventsUpdatedSinceMostRecentlyModifiedEvent.map(
              (event) =>
                ({
                  updateOne: {
                    filter: { ...ioIcalMeta, uid: event.uid },
                    update: {
                      $set: {
                        ...event,
                        // iCal DTEND is exclusive, so we subtract 1ms to make it inclusive
                        end: isDate(event.end)
                          ? subMilliseconds(event.end, 1)
                          : event.end,
                        recurrences:
                          event.recurrences && Object.values(event.recurrences),
                        exdate: event.exdate && Object.values(event.exdate),
                        calendar,
                        _io_scrapedAt,
                        ...ioIcalMeta,
                      },
                    },
                    upsert: true,
                  },
                }) as const,
            ),
          );
          setUpdated(upsertResult);
          yield `Upserted ${eventsUpdatedSinceMostRecentlyModifiedEvent.length} events for icalUrlHash: ${icalUrlHash} in ${((new Date().getTime() - now3.getTime()) / 1000).toFixed(2)} seconds`;
        } else {
          yield `No events updated since most recently modified event for icalUrlHash: ${icalUrlHash}, skipping insert`;
        }

        yield {
          icalUrlHash,
          fetchedEventsCount: events.length,
          existingEventsCount: existingEventIds.length,
          deletedCount: deleteResult.deletedCount,
          upsertResult,
          duration: ((new Date().getTime() - now0.getTime()) / 1000).toFixed(2),
        };
      },
    );
  });
