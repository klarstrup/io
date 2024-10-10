import { TZDate } from "@date-fns/tz";
import {
  areIntervalsOverlapping,
  type Interval,
  isWithinInterval,
} from "date-fns";
import { dbFetch } from "../fetch";
import { HOUR_IN_SECONDS } from "../utils";
import { CalendarResponse, parseICS, type VEvent } from "../vendor/ical";

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
  const eventsThatFallWithinRange: VEvent[] = [];
  for (const event of Object.values(data)) {
    if (
      event.type === "VEVENT" &&
      (event.rrule
        ? event.rrule?.between(dateInterval.start, dateInterval.end).length
        : isWithinInterval(event.start, dateInterval))
    ) {
      if (
        event.rrule?.between(dateInterval.start, dateInterval.end).length &&
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
            eventsThatFallWithinRange.push(recurrence);
          }
        }
      } else if (isWithinInterval(event.start, dateInterval)) {
        eventsThatFallWithinRange.push(event);
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
