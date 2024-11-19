import { differenceInMilliseconds } from "date-fns";
import {
  ICalCalendar,
  ICalCategory,
  ICalEventBusyStatus,
} from "ical-generator";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";
import type { EventEntry } from "../../lib";
import { Users } from "../../models/user.server";
import {
  getIoClimbAlongCompetitionEventEntry,
  ioClimbAlongEventsWithIds,
} from "../../sources/climbalong";
import { getSongkickEvents } from "../../sources/songkick";
import {
  getSportsTimingEventEntry,
  ioSportsTimingEventsWithIds,
} from "../../sources/sportstiming";
import { getTopLoggerGroupEventEntry } from "../../sources/toplogger";
import { TopLoggerGroupUsers } from "../../sources/toplogger.server";
import { MINUTE_IN_SECONDS } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const revalidate = 600; // 10 minutes

export async function GET() {
  const user = await Users.findOne();

  const eventsPromises: (Promise<EventEntry> | EventEntry)[] = [];

  eventsPromises.push(
    ...ioClimbAlongEventsWithIds.map(([eventId, ioId]) =>
      getIoClimbAlongCompetitionEventEntry(eventId, ioId),
    ),
    ...(user?.topLoggerId
      ? await TopLoggerGroupUsers.find({ user_id: user.topLoggerId }).toArray()
      : []
    ).map(({ group_id, user_id }) =>
      getTopLoggerGroupEventEntry(group_id, user_id),
    ),
  );

  eventsPromises.push(
    ...ioSportsTimingEventsWithIds.map(([eventId, ioId]) =>
      getSportsTimingEventEntry(eventId, ioId),
    ),
  );

  eventsPromises.push(...(await getSongkickEvents()));

  const events = await Promise.all(eventsPromises).then((events) =>
    events.sort((a, b) => differenceInMilliseconds(b.start, a.start)),
  );
  const calendar = new ICalCalendar({
    name: "ioCal",
    ttl: MINUTE_IN_SECONDS,
    url: "https://io.klarstrup.dk/io.ics",
  });
  for (const event of events) {
    calendar.createEvent({
      id: event.id,
      busystatus: ICalEventBusyStatus.BUSY,
      timezone: "Europe/Copenhagen",
      start: DateTime.fromJSDate(event.start, { zone: "UTC" }).setZone(
        "Europe/Copenhagen",
      ),
      end: DateTime.fromJSDate(event.end, { zone: "UTC" }).setZone(
        "Europe/Copenhagen",
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
