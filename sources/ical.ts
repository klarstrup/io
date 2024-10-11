import { TZDate } from "@date-fns/tz";
import {
  areIntervalsOverlapping,
  type Interval,
  isWithinInterval,
} from "date-fns";
import { RRule } from "rrule";
import { dbFetch } from "../fetch";
import { VEventWithVCalendar } from "../lib";
import { HOUR_IN_SECONDS } from "../utils";
import { CalendarResponse, parseICS } from "../vendor/ical";

export const fetchAndParseIcal = async (icalUrl: string) =>
  parseICS(
    await dbFetch<string>(icalUrl, undefined, {
      parseJson: false,
      maxAge: HOUR_IN_SECONDS,
    })
  );

export function getIcalEventsBetween(
  data: CalendarResponse,
  dateInterval: Interval<Date, Date> | Interval<TZDate, TZDate>
) {
  const extras = {
    calendar: getIcalCalendar(data),
    _io_scrapedAt: new Date(),
    _io_userId: "string",
    _io_iCalId: "string",
  };

  const eventsThatFallWithinRange: VEventWithVCalendar[] = [];
  for (const event of Object.values(data)) {
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
            eventsThatFallWithinRange.push({ ...recurrence, ...extras });
          }
        }
      } else if (isWithinInterval(event.start, dateInterval)) {
        eventsThatFallWithinRange.push({ ...event, ...extras });
      }
    }
  }

  return eventsThatFallWithinRange;
}

export function getIcalCalendar(data: CalendarResponse) {
  for (const event of Object.values(data)) {
    if (event.type === "VCALENDAR") return event;
  }

  throw new Error("No VCALENDAR found in ical");
}
