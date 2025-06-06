import { createHash } from "crypto";
import { auth } from "../../../auth";
import type { IcalIoMeta } from "../../../lib";
import { extractIcalCalendarAndEvents } from "../../../sources/ical";
import { IcalEvents } from "../../../sources/ical.server";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { parseICS } from "../../../vendor/ical";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.ICal) continue;

      yield* wrapSource(dataSource, user, async function* ({ url }) {
        if (!url) return;

        const icalData = parseICS(await fetch(url).then((r) => r.text()));

        const icalUrlHash = createHash("sha256")
          .update(url + user.id)
          .digest("hex");

        const _io_scrapedAt = new Date();
        const ioIcalMeta: IcalIoMeta = {
          _io_userId: user.id,
          _io_icalUrlHash: icalUrlHash,
        };
        const { calendar, events } = extractIcalCalendarAndEvents(icalData);

        const existingEventsCount = await IcalEvents.countDocuments(ioIcalMeta);

        // This accounts for a situation where we ingest an empty or otherwise malformed iCal feed
        if (existingEventsCount * 0.25 > events.length) {
          console.log(
            `Existing events count(${existingEventsCount}) is much greater than new events count(${events.length}) for icalUrlHash: ${icalUrlHash}, skipping`,
          );
          return;
        }
        const deleteResult = await IcalEvents.deleteMany(ioIcalMeta);
        const insertResult = await IcalEvents.insertMany(
          events.map((event) => ({
            ...event,
            recurrences: event.recurrences && Object.values(event.recurrences),
            calendar,
            _io_scrapedAt,
            ...ioIcalMeta,
          })),
        );

        yield {
          icalUrlHash,
          fetchedEventsCount: events.length,
          existingEventsCount: existingEventsCount,
          deletedCount: deleteResult.deletedCount,
          insertedCount: insertResult.insertedCount,
        };
      });
    }
  });
