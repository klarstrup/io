import { createHash } from "crypto";
import { auth } from "../../../auth";
import { getDB } from "../../../dbConnect";
import type { IcalIoMeta, MongoVEventWithVCalendar } from "../../../lib";
import {
  extractIcalCalendarAndEvents,
  fetchAndParseIcal,
} from "../../../sources/ical";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const user = (await auth())?.user;
  if (!user) return new Response("Unauthorized", { status: 401 });

  const responseStream = new TransformStream<Uint8Array, string>();
  const writer = responseStream.writable.getWriter();

  const DB = await getDB();
  const eventsCollection =
    DB.collection<MongoVEventWithVCalendar>("ical_events");

  (async () => {
    const encoder = new TextEncoder();

    await writer.write(encoder.encode("[\n"));
    let first = true;

    for (const icalUrl of user.icalUrls ?? []) {
      const icalData = await fetchAndParseIcal(icalUrl);

      const icalUrlHash = createHash("sha256")
        .update(icalUrl + user.id)
        .digest("hex");

      const _io_scrapedAt = new Date();
      const ioIcalMeta: IcalIoMeta = {
        _io_userId: user.id,
        _io_icalUrlHash: icalUrlHash,
      };
      const { calendar, events } = extractIcalCalendarAndEvents(icalData);

      const existingEventsCount =
        await eventsCollection.countDocuments(ioIcalMeta);

      // This accounts for a situation where we ingest an empty or otherwise malformed iCal feed
      if (existingEventsCount * 0.9 > events.length) {
        console.log(
          `Existing events count(${existingEventsCount}) is much greater than new events count(${events.length}) for icalUrlHash: ${icalUrlHash}, skipping`,
        );
        continue;
      }
      const deleteResult = await eventsCollection.deleteMany(ioIcalMeta);
      const insertResult = await eventsCollection.insertMany(
        events.map((event) => ({
          ...event,
          recurrences: event.recurrences && Object.values(event.recurrences),
          calendar,
          _io_scrapedAt,
          ...ioIcalMeta,
        })),
      );

      if (first) {
        first = false;
      } else {
        await writer.write(encoder.encode(",\n"));
      }

      await writer.write(
        encoder.encode(
          JSON.stringify({
            icalUrlHash,
            fetchedEventsCount: events.length,
            existingEventsCount: existingEventsCount,
            deletedCount: deleteResult.deletedCount,
            insertedCount: insertResult.insertedCount,
          }),
        ),
      );
    }

    await writer.write(encoder.encode("\n]"));

    await writer.close();
  })().catch(() => {});

  return new Response(responseStream.readable, {
    headers: { "Content-Type": "application/json" },
  });
}
