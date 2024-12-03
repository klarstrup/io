import { createHash } from "crypto";
import { ObjectId } from "mongodb";
import { auth } from "../../../auth";
import type { IcalIoMeta } from "../../../lib";
import { Users } from "../../../models/user.server";
import {
  extractIcalCalendarAndEvents,
  fetchAndParseIcal,
} from "../../../sources/ical";
import { IcalEvents } from "../../../sources/ical.server";
import { DataSource } from "../../../sources/utils";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    const userIcalSources = user.dataSources?.filter(
      (source) => source.source === DataSource.ICal,
    );

    for (const {
      id,
      config: { url },
    } of userIcalSources ?? []) {
      await Users.updateOne(
        { _id: new ObjectId(user.id) },
        { $set: { "dataSources.$[source].lastAttemptedAt": new Date() } },
        { arrayFilters: [{ "source.id": id }] },
      );
      const runtime = Date.now();

      const icalData = await fetchAndParseIcal(url);

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
        continue;
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

      await Users.updateOne(
        { _id: new ObjectId(user.id) },
        {
          $set: {
            "dataSources.$[source].lastSuccessfulAt": new Date(),
            "dataSources.$[source].lastSuccessfulRuntime": Date.now() - runtime,
            "dataSources.$[source].lastResult": "success",
          },
        },
        { arrayFilters: [{ "source.id": id }] },
      );

      yield {
        icalUrlHash,
        fetchedEventsCount: events.length,
        existingEventsCount: existingEventsCount,
        deletedCount: deleteResult.deletedCount,
        insertedCount: insertResult.insertedCount,
      };
    }
  });
