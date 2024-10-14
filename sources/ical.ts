import { TZDate } from "@date-fns/tz";
import {
  addSeconds,
  areIntervalsOverlapping,
  differenceInSeconds,
  subMinutes,
  type Interval,
} from "date-fns";
import type { FilterOperators } from "mongodb";
import { RRule } from "rrule";
import { auth } from "../auth";
import { getDB } from "../dbConnect";
import { dbFetch } from "../fetch";
import type { MongoVEventWithVCalendar } from "../lib";
import { MINUTE_IN_SECONDS, omit } from "../utils";
import {
  parseICS,
  type VCalendar,
  type CalendarResponse,
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

  const eventsThatFallWithinRange: MongoVEventWithVCalendar[] = [];
  // Sadly we can't select the date range from the database because of recurrence logic
  const dateSelector = {
    $or: [
      { start: { $gte: start, $lte: end } },
      { end: { $gte: start, $lte: end } },
    ],
  } satisfies FilterOperators<Omit<VEvent, "recurrences">>;
  for await (const event of DB.collection<MongoVEventWithVCalendar>(
    "ical_events",
  ).find({
    _io_userId: userId,
    type: "VEVENT",
    $or: [
      dateSelector,
      { recurrences: { $elemMatch: dateSelector } },
      {
        "rrule.options.dtstart": { $lte: end },
        "rrule.options.until": { $gte: start },
      },
      {
        "rrule.options.dtstart": { $lte: end },
        "rrule.options.until": null,
      },
    ],
  })) {
    const rrule = event.rrule?.origOptions
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
                event.rrule.origOptions.dtstart.getTimezoneOffset(),
            ),
        })
      : undefined;
    const rruleDates = rrule?.between(start, end, true);

    if (event.recurrences) {
      for (const recurrence of event.recurrences) {
        if (
          areIntervalsOverlapping(
            { start: recurrence.start, end: recurrence.end },
            { start, end },
          )
        ) {
          eventsThatFallWithinRange.push({
            ...recurrence,
            calendar: event.calendar,
            _io_icalUrlHash: event._io_icalUrlHash,
            _io_userId: event._io_userId,
            _io_scrapedAt: event._io_scrapedAt,
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
        if (
          event.recurrences?.some(
            (recurrence) => recurrence.start.getTime() === rruleDate.getTime(),
          )
        ) {
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

  return eventsThatFallWithinRange;
}
