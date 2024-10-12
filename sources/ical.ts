import { TZDate } from "@date-fns/tz";
import {
  areIntervalsOverlapping,
  type Interval,
  isWithinInterval,
} from "date-fns";
import { RRule } from "rrule";
import { auth } from "../auth";
import { getDB } from "../dbConnect";
import { dbFetch } from "../fetch";
import type { MongoVEventWithVCalendar, VEventWithVCalendar } from "../lib";
import { MINUTE_IN_SECONDS, omit } from "../utils";
import {
  type CalendarResponse,
  parseICS,
  VCalendar,
  type VEvent,
} from "../vendor/ical";

export const fetchAndParseIcal = async (icalUrl: string) =>
  parseICS(
    await dbFetch<string>(icalUrl, undefined, {
      parseJson: false,
      maxAge: MINUTE_IN_SECONDS,
    })
  );

export function extractIcalCalendarAndEvents(data: CalendarResponse) {
  let calendar: VCalendar | undefined;
  const events: VEvent[] = [];

  for (const component of Object.values(data)) {
    switch (component.type) {
      case "VCALENDAR":
        calendar = component;
        break;
      case "VEVENT":
        events.push(component);
        break;
    }
  }

  if (!calendar) throw new Error("No calendar found in iCal data");

  return { calendar, events };
}

export async function getUserIcalEventsBetween(
  userId: string,
  dateInterval: Interval<Date, Date> | Interval<TZDate, TZDate>
) {
  const user = (await auth())?.user;
  if (!user || userId !== user.id) throw new Error("Unauthorized");

  const DB = await getDB();

  const eventsThatFallWithinRange: VEventWithVCalendar[] = [];
  for await (const event of DB.collection<MongoVEventWithVCalendar>(
    "ical_events"
  ).find({
    _io_userId: userId,
  })) {
    const rrule =
      event.type === "VEVENT" &&
      event.rrule?.origOptions &&
      new RRule({
        ...event.rrule.origOptions,
        dtstart:
          event.rrule.origOptions.dtstart &&
          new Date(event.rrule.origOptions.dtstart),
        until:
          event.rrule.origOptions.until &&
          new Date(event.rrule.origOptions.until),
      });

    if (
      event.type === "VEVENT" &&
      (rrule
        ? rrule.between(dateInterval.start, dateInterval.end).length
        : isWithinInterval(event.start, dateInterval))
    ) {
      if (
        rrule &&
        rrule.between(dateInterval.start, dateInterval.end).length &&
        event.recurrences
      ) {
        for (const recurrence of Object.values(event.recurrences)) {
          if (
            areIntervalsOverlapping(
              {
                start: recurrence.start,
                end: recurrence.end,
              },
              dateInterval
            )
          ) {
            eventsThatFallWithinRange.push({
              ...recurrence,
              calendar: event.calendar,
            });
          }
        }
      } else if (isWithinInterval(event.start, dateInterval)) {
        eventsThatFallWithinRange.push(omit(event, "_id"));
      }
    }
  }

  return eventsThatFallWithinRange;
}
