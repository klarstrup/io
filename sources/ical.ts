import { TZDate } from "@date-fns/tz";
import {
  addSeconds,
  areIntervalsOverlapping,
  differenceInSeconds,
  subMinutes,
  type Interval,
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
    }),
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
  { start, end }: Interval<Date, Date> | Interval<TZDate, TZDate>,
) {
  const user = (await auth())?.user;
  if (!user || userId !== user.id) throw new Error("Unauthorized");

  const DB = await getDB();

  const eventsThatFallWithinRange: VEventWithVCalendar[] = [];
  // Sadly we can't select the date range from the database because of recurrence logic
  for await (const event of DB.collection<MongoVEventWithVCalendar>(
    "ical_events",
  ).find({
    _io_userId: userId,
  })) {
    const rrule =
      event.type === "VEVENT" && event.rrule?.origOptions
        ? new RRule({
            ...event.rrule.origOptions,
            dtstart:
              event.rrule.origOptions.dtstart &&
              subMinutes(
                event.rrule.origOptions.dtstart,
                new TZDate(
                  event.rrule.origOptions.dtstart,
                  "Europe/Copenhagen",
                ).getTimezoneOffset() -
                  new TZDate(
                    event.rrule.origOptions.dtstart,
                  ).getTimezoneOffset(),
              ),
          })
        : undefined;
    const rruleDates = rrule?.between(start, end, true);
    if (event.type === "VEVENT") {
      if (event.recurrences) {
        for (const recurrence of Object.values(event.recurrences)) {
          if (
            areIntervalsOverlapping(
              { start: recurrence.start, end: recurrence.end },
              { start, end },
            )
          ) {
            eventsThatFallWithinRange.push({
              ...recurrence,
              calendar: event.calendar,
            });
          }
        }
      }
      if (
        areIntervalsOverlapping(
          { start: event.start, end: event.end },
          { start, end },
        )
      ) {
        eventsThatFallWithinRange.push(omit(event, "_id"));
      }
      if (rruleDates) {
        for (const rruleDate of rruleDates) {
          if (event.recurrences?.[rruleDate.toISOString().slice(0, 10)]) {
            continue;
          }
          eventsThatFallWithinRange.push({
            ...omit(event, "_id"),
            // RRule date is not in the correct timezone.
            // This is partially because RRule only deals in UTC dates.
            // But also because we are not accounting for timezone when scraping the iCal feed.
            start: rruleDate,
            end: addSeconds(
              rruleDate,
              differenceInSeconds(event.start, event.end),
            ),
          });
        }
      }
    }
  }

  return eventsThatFallWithinRange;
}
