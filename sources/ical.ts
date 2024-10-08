import { TZDate } from "@date-fns/tz";
import { Interval, isWithinInterval } from "date-fns";
import ical, { VEvent } from "node-ical";
import { dbFetch } from "../fetch";
import { HOUR_IN_SECONDS } from "../utils";

export async function fetchIcalEventsBetween(
  icalUrl: string,
  dateInterval: Interval<Date, Date> | Interval<TZDate, TZDate>
) {
  const icalStr = await dbFetch<string>(icalUrl, undefined, {
    parseJson: false,
    maxAge: HOUR_IN_SECONDS,
  });
  const data = ical.parseICS(icalStr);

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
          if (isWithinInterval(recurrence.start, dateInterval)) {
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

export async function fetchIcalCalendar(icalUrl: string) {
  const icalStr = await dbFetch<string>(icalUrl, undefined, {
    parseJson: false,
    maxAge: HOUR_IN_SECONDS,
  });
  const data = ical.parseICS(icalStr);
  for (const event of Object.values(data)) {
    if (event.type === "VCALENDAR") {
      return event;
    }
  }

  throw new Error("No VCALENDAR found in ical");
}
