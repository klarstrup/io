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
import { User } from "../../models/user";
import { getIoClimbAlongCompetitionEventEntry } from "../../sources/climbalong";
import { getSongkickEvents } from "../../sources/songkick";
import { getSportsTimingEventEntry } from "../../sources/sportstiming";
import {
  TopLogger,
  getTopLoggerGroupEventEntry,
  getUser,
} from "../../sources/toplogger";
import { MINUTE_IN_SECONDS } from "../../utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const DB = (await dbConnect()).connection.db;

  // Io is the only user in the database,
  const user = await User.findOne();

  let topLoggerUser: TopLogger.UserSingle | null = null;
  try {
    topLoggerUser = user?.topLoggerId ? await getUser(user.topLoggerId) : null;
  } catch (e) {
    /* */
  }
  const topLoggerUserId = topLoggerUser?.id;

  const eventsPromises: (Promise<EventEntry> | EventEntry)[] = [];

  eventsPromises.push(
    getIoClimbAlongCompetitionEventEntry(13, 844),
    getIoClimbAlongCompetitionEventEntry(20, 1284),
    getIoClimbAlongCompetitionEventEntry(26, 3381),
    getIoClimbAlongCompetitionEventEntry(27, 8468),
    getIoClimbAlongCompetitionEventEntry(28, 10770),
    getIoClimbAlongCompetitionEventEntry(30, 11951),
    getIoClimbAlongCompetitionEventEntry(32, 12091),
    getIoClimbAlongCompetitionEventEntry(33, 12477),
    getIoClimbAlongCompetitionEventEntry(34, 14063),
    getIoClimbAlongCompetitionEventEntry(147),
    getIoClimbAlongCompetitionEventEntry(148),
    getIoClimbAlongCompetitionEventEntry(149),
    getIoClimbAlongCompetitionEventEntry(150),
    getIoClimbAlongCompetitionEventEntry(151),
    getIoClimbAlongCompetitionEventEntry(152),
    getIoClimbAlongCompetitionEventEntry(153),
    getIoClimbAlongCompetitionEventEntry(154),
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
    getSportsTimingEventEntry(12576, 5298030),
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
