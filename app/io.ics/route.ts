import { differenceInMilliseconds } from "date-fns";
import {
  ICalCalendar,
  ICalCategory,
  ICalEventBusyStatus,
} from "ical-generator";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";
import { auth } from "../../auth";
import { getDB } from "../../dbConnect";
import { EventEntry } from "../../lib";
import {
  getIoClimbAlongCompetitionEventEntry,
  ioClimbAlongEventsWithIds,
} from "../../sources/climbalong";
import { getSongkickEvents } from "../../sources/songkick";
import {
  getSportsTimingEventEntry,
  ioSportsTimingEventsWithIds,
} from "../../sources/sportstiming";
import {
  TopLogger,
  fetchUser,
  getTopLoggerGroupEventEntry,
} from "../../sources/toplogger";
import { MINUTE_IN_SECONDS } from "../../utils";
import { IUser } from "../../models/user";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const DB = await getDB();
  const user = await DB.collection<IUser>("users").findOne();

  let topLoggerUser: TopLogger.User | null = null;
  try {
    topLoggerUser = user?.topLoggerId
      ? await fetchUser(user.topLoggerId)
      : null;
  } catch {
    /* */
  }
  const topLoggerUserId = topLoggerUser?.id;

  const eventsPromises: (Promise<EventEntry> | EventEntry)[] = [];

  eventsPromises.push(
    ...ioClimbAlongEventsWithIds.map(([eventId, ioId]) =>
      getIoClimbAlongCompetitionEventEntry(eventId, ioId)
    ),
    ...(
      await DB.collection<Omit<TopLogger.GroupUserMultiple, "user">>(
        "toplogger_group_users"
      )
        .find({ user_id: topLoggerUserId })
        .toArray()
    ).map(({ group_id, user_id }) =>
      getTopLoggerGroupEventEntry(group_id, user_id)
    )
  );

  eventsPromises.push(
    ...ioSportsTimingEventsWithIds.map(([eventId, ioId]) =>
      getSportsTimingEventEntry(eventId, ioId)
    )
  );

  eventsPromises.push(...(await getSongkickEvents()));

  const events = await Promise.all(eventsPromises).then((events) =>
    events.sort((a, b) => differenceInMilliseconds(b.start, a.start))
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
