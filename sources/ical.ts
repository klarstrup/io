import { tz, TZDate } from "@date-fns/tz";
import {
  addSeconds,
  areIntervalsOverlapping,
  compareAsc,
  differenceInSeconds,
  subMinutes,
  type Interval,
} from "date-fns";
import type { FilterOperators } from "mongodb";
import { RRule } from "rrule";
import { auth } from "../auth";
import type { MongoVEvent, MongoVTodo } from "../lib";
import { DEFAULT_TIMEZONE, omit, roundToNearestDay } from "../utils";
import type {
  CalendarResponse,
  VCalendar,
  VEvent,
  VTodo,
} from "../vendor/ical";
import { IcalEvents } from "./ical.server";

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

  const eventsThatFallWithinRange: (MongoVEvent | MongoVTodo)[] = [];
  // Sadly we can't select the date range from the database because of recurrence logic
  const dateSelector = {
    $or: [
      { start: { $gte: start, $lte: end } },
      { end: { $gte: start, $lte: end } },
      { start: { $lte: start }, end: { $gte: end } },
      // VTODOs may not have an end date or a start date or a due date
      { start: { $gte: start, $lte: end } },
      { due: { $gte: start, $lte: end } },
      { completed: { $gte: start, $lte: end } },
      { start: { $exists: false } },
    ],
  } satisfies FilterOperators<Omit<VEvent | VTodo, "recurrences">>;

  await IcalEvents.createIndexes([
    { key: { _io_userId: 1, type: 1, start: 1 } },
    { key: { _io_icalUrlHash: 1, _io_userId: 1 } },
  ]);
  for await (const event of IcalEvents.find({
    _io_userId: userId,
    type: { $in: ["VTODO", "VEVENT"] },
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
                event.rrule.options.tzid ?? DEFAULT_TIMEZONE,
              ).getTimezoneOffset() -
                event.rrule.origOptions.dtstart.getTimezoneOffset(),
            ),
        })
      : undefined;
    const rruleDates = rrule?.between(start, end, true);

    if (event.recurrences) {
      for (const recurrence of event.recurrences) {
        if (
          !recurrence.start ||
          (recurrence.start && "end" in recurrence
            ? areIntervalsOverlapping(
                { start: recurrence.start, end: recurrence.end },
                { start, end },
              )
            : recurrence.start
              ? recurrence.start >= start && recurrence.start <= end
              : false)
        ) {
          eventsThatFallWithinRange.push({
            ...recurrence,
            _io_icalUrlHash: event._io_icalUrlHash,
            _io_userId: event._io_userId,
            _io_scrapedAt: event._io_scrapedAt,
            _io_source: event._io_source,
          });
        }
      }
    }
    if (
      "datetype" in event
        ? areIntervalsOverlapping(
            {
              start:
                event && event.datetype === "date"
                  ? roundToNearestDay(event.start, {
                      in: tz(event.start.tz || DEFAULT_TIMEZONE),
                    })
                  : event.start,
              end:
                event.datetype === "date"
                  ? roundToNearestDay(event.end, {
                      in: tz(event.end.tz || DEFAULT_TIMEZONE),
                    })
                  : event.end,
            },
            { start, end },
          )
        : event.start
          ? event.start >= start && event.start <= end
          : event.due
            ? event.due >= start && event.due <= end
            : event.completed
              ? event.completed >= start && event.completed <= end
              : !event.start
    ) {
      eventsThatFallWithinRange.push(
        "datetype" in event ? omit(event, "_id") : omit(event, "_id"),
      );
    }
    if (rruleDates) {
      for (const rruleDate of rruleDates) {
        if (
          event.recurrences?.some(
            (recurrence: Omit<VEvent | VTodo, "recurrences">) =>
              // These should be the same date, but timezones get fucked for whatever reason
              recurrence.recurrenceid?.toLocaleDateString() ===
              rruleDate.toLocaleDateString(),
          )
        ) {
          continue;
        }
        eventsThatFallWithinRange.push(
          "end" in event
            ? {
                ...omit(event, "_id"),
                // RRule date is not in the correct timezone.
                // This is partially because RRule only deals in UTC dates.
                // But also because we are not accounting for timezone when scraping the iCal feed.
                start: rruleDate,
                end: addSeconds(
                  rruleDate,
                  differenceInSeconds(event.end, event.start),
                ),
              }
            : {
                ...omit(event, "_id"),
                // RRule date is not in the correct timezone.
                // This is partially because RRule only deals in UTC dates.
                // But also because we are not accounting for timezone when scraping the iCal feed.
                start: rruleDate,
              },
        );
      }
    }
  }

  return eventsThatFallWithinRange.sort((a, b) =>
    compareAsc(a.start!, b.start!),
  );
}
