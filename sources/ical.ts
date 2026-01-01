import { tz, TZDate, tzOffset } from "@date-fns/tz";
import {
  addMinutes,
  addSeconds,
  areIntervalsOverlapping,
  compareAsc,
  differenceInSeconds,
  type Interval,
} from "date-fns";
import type { FilterOperators, WithId } from "mongodb";
import { RRule, RRuleSet } from "rrule";
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

  const eventsThatFallWithinRange: MongoVEvent[] = [];
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
  } satisfies FilterOperators<Omit<VEvent, "recurrences">>;

  await IcalEvents.createIndexes([
    { key: { _io_userId: 1, type: 1, start: 1 } },
    { key: { _io_icalUrlHash: 1, _io_userId: 1 } },
  ]);
  for await (const event of IcalEvents.find<WithId<MongoVEvent>>({
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
      areIntervalsOverlapping(
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
    ) {
      eventsThatFallWithinRange.push(omit(event, "_id"));
    }
    const rrule = event.rrule?.origOptions
      ? new RRule({ ...event.rrule.origOptions, tzid: "UTC" })
      : undefined;

    if (rrule) {
      const dtstart = event.rrule!.origOptions.dtstart!;
      const tzid = event.rrule!.origOptions.tzid!;
      const rruleSet = new RRuleSet();

      rruleSet.rrule(rrule);

      const ogOffset = tzOffset(tzid, dtstart);
      const adjustedExdates = Array.isArray(event.exdate)
        ? event.exdate.map((date) =>
            addMinutes(date, tzOffset(tzid, date) - ogOffset),
          )
        : [];
      for (const exdate of adjustedExdates) rruleSet.exdate(exdate);

      const rruleDates = rruleSet
        .between(start, end, true)
        .map((date) => addMinutes(date, ogOffset - tzOffset(tzid, date)));
      if (rruleDates?.length) {
        for (const rruleDate of rruleDates) {
          if (
            event.recurrences?.some(
              (recurrence: Omit<VEvent, "recurrences">) =>
                // These should be the same date, but timezones get fucked for whatever reason
                recurrence.recurrenceid?.toLocaleDateString() ===
                rruleDate.toLocaleDateString(),
            )
          ) {
            continue;
          }
          eventsThatFallWithinRange.push({
            ...omit(event, "_id"),
            start: rruleDate,
            end: addSeconds(
              rruleDate,
              differenceInSeconds(event.end, event.start),
            ),
          });
        }
      }
    }
  }

  return eventsThatFallWithinRange.sort((a, b) => compareAsc(a.start, b.start));
}

export async function getUserIcalTodosBetween(
  userId: string,
  interval?: Interval<Date, Date> | Interval<TZDate, TZDate>,
) {
  const { start, end } = interval || {};
  const user = (await auth())?.user;
  if (!user || userId !== user.id) throw new Error("Unauthorized");

  const eventsThatFallWithinRange: MongoVTodo[] = [];
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
      { completed: { $exists: false } },
      { completed: undefined },
      { start: { $exists: false } },
      { start: undefined },
    ],
  } satisfies FilterOperators<Omit<VTodo, "recurrences">>;

  await IcalEvents.createIndexes([
    { key: { _io_userId: 1, type: 1, start: 1 } },
    { key: { _io_icalUrlHash: 1, _io_userId: 1 } },
  ]);
  for await (const todo of IcalEvents.find<WithId<MongoVTodo>>({
    _io_userId: userId,
    type: "VTODO",
    ...dateSelector,
  })) {
    if (
      todo.start && end
        ? todo.start <= end
        : todo.due && end
          ? todo.due <= end
          : todo.completed && start && end
            ? todo.completed >= start && todo.completed <= end
            : true
    ) {
      eventsThatFallWithinRange.push(omit(todo, "_id") as MongoVTodo);
    }
  }

  return eventsThatFallWithinRange.sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    return compareAsc(
      a.completed || a.start || a.created!,
      b.completed || b.start || b.created!,
    );
  });
}
