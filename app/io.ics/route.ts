import { differenceInMilliseconds } from "date-fns";
import {
  ICalCalendar,
  ICalCategory,
  ICalEventBusyStatus,
} from "ical-generator";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";
import dbConnect from "../../dbConnect";
import { EventEntry } from "../../lib";
import { getIoClimbAlongCompetitionEventEntry } from "../../sources/climbalong";
import { getSongkickEvents } from "../../sources/songkick";
import { getSportsTimingEventEntry } from "../../sources/sportstiming";
import {
  IO_TOPLOGGER_ID,
  getGroupsUsers,
  getIoTopLoggerGroupEventEntry,
} from "../../sources/toplogger";
import { MINUTE_IN_SECONDS } from "../../utils";

export async function GET() {
  await dbConnect();

  const eventsPromises: (Promise<EventEntry> | EventEntry)[] = [];

  eventsPromises.push(
    getIoClimbAlongCompetitionEventEntry(13, 844),
    getIoClimbAlongCompetitionEventEntry(20, 1284),
    getIoClimbAlongCompetitionEventEntry(26, 3381),
    getIoClimbAlongCompetitionEventEntry(27, 8468),
    getIoClimbAlongCompetitionEventEntry(28, 10770),
    getIoClimbAlongCompetitionEventEntry(30),
    ...(await getGroupsUsers({ filters: { user_id: IO_TOPLOGGER_ID } })).map(
      ({ group_id, user_id }) =>
        getIoTopLoggerGroupEventEntry(group_id, user_id)
    )
  );

  eventsPromises.push(
    getSportsTimingEventEntry(11107, 5177996),
    getSportsTimingEventEntry(10694, 5096890),
    getSportsTimingEventEntry(8962, 4433356),
    getSportsTimingEventEntry(8940, 3999953),
    getSportsTimingEventEntry(7913, 3825124),
    getSportsTimingEventEntry(5805, 2697593),
    getSportsTimingEventEntry(5647, 2619935),
    getSportsTimingEventEntry(4923, 2047175)
  );

  eventsPromises.push(...(await getSongkickEvents()));

  const events = await Promise.all(eventsPromises).then((events) =>
    events.sort((a, b) => differenceInMilliseconds(b.start, a.start))
  );
  const calendar = new ICalCalendar({
    name: "ioCal",
    ttl: MINUTE_IN_SECONDS,
  });
  for (const event of events) {
    calendar.createEvent({
      id: event.id,
      busystatus: ICalEventBusyStatus.BUSY,
      timezone: "Europe/Copenhagen",
      start: DateTime.fromJSDate(event.start, { zone: "UTC" }).setZone(
        "Europe/Copenhagen"
      ),
      end: DateTime.fromJSDate(event.end, { zone: "UTC" }).setZone(
        "Europe/Copenhagen"
      ),
      summary: event.event,
      categories: [
        new ICalCategory({ name: event.discipline }),
        new ICalCategory({ name: event.type }),
      ],
      location: event.location || event.venue,
    });
  }

  return new NextResponse(calendar.toString(), {
    headers: { "Content-Type": "text/calendar" },
  });
}
