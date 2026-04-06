import { TZDate, tzOffset } from "@date-fns/tz";
import { createHash } from "crypto";
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
import { omit } from "../utils";
import type {
  CalendarResponse,
  VCalendar,
  VEvent,
  VTodo,
} from "../vendor/ical";
import { IcalEvents } from "./ical.server";
import { DataSource, type UserDataSource } from "./utils";

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
    ],
  } satisfies FilterOperators<Omit<VEvent, "recurrences">>;

  const dataSourceByUrlHash = user.dataSources
    ?.filter((s) => s.source === DataSource.ICal)
    .reduce(
      (acc, s) => {
        const hash = createHash("sha256")
          .update(s.config.url + user.id)
          .digest("hex");
        acc[hash] = s;
        return acc;
      },
      {} as Record<
        string,
        Extract<UserDataSource, { source: DataSource.ICal }>
      >,
    );

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
    const dataSource = dataSourceByUrlHash?.[event._io_icalUrlHash!];

    if (dataSource?.config.url.includes("proprty.ai")) {
      // Company calendars often have no location set but they're nearly always at the office
      if (!event.location) {
        event.location = "Gammel Mønt 3, 1117 København, Denmark";
      }
    }

    const sourceStartDate = dataSource?.config.startDate;
    const eventWithoutId = omit(event, "_id");

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
          if (
            sourceStartDate &&
            recurrence.end &&
            recurrence.end < sourceStartDate
          ) {
            continue;
          }
          eventsThatFallWithinRange.push({
            ...recurrence,
            uid: `${recurrence.start.toLocaleDateString()}-${event.uid}`,
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
        { start: event.start, end: event.end },
        { start, end },
      )
    ) {
      if (sourceStartDate && event.end < sourceStartDate) continue;

      eventsThatFallWithinRange.push(eventWithoutId);
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

      // Avoid adding reccurences of the original event instance
      rruleSet.exdate(dtstart);

      const eventDurationSeconds = differenceInSeconds(event.end, event.start);
      const rruleDates = rruleSet
        .between(start, end, true)
        .map((date) => addMinutes(date, ogOffset - tzOffset(tzid, date)));
      const recurrenceIdDates = new Set(
        event.recurrences
          ?.map((r) => r.recurrenceid?.toLocaleDateString())
          .filter(Boolean),
      );
      if (rruleDates?.length) {
        for (const rruleDate of rruleDates) {
          // Skip if this date was overridden by a recurrence instance
          if (recurrenceIdDates.has(rruleDate.toLocaleDateString())) {
            continue;
          }
          const rruleDateEnd = addSeconds(rruleDate, eventDurationSeconds);
          if (
            sourceStartDate &&
            rruleDateEnd &&
            rruleDateEnd < sourceStartDate
          ) {
            continue;
          }
          eventsThatFallWithinRange.push({
            ...eventWithoutId,
            uid: `${rruleDate.toLocaleDateString()}-${event.uid}`,
            start: rruleDate,
            end: rruleDateEnd,
          });
        }
      }
    }
  }

  return eventsThatFallWithinRange.sort((a, b) => compareAsc(a.start, b.start));
}

export async function getUserIcalTodosBetween(
  userId: string,
  interval?: Interval<Date, Date> | Interval<TZDate, TZDate> | null,
) {
  const { start, end } = interval || {};
  const user = (await auth())?.user;
  if (!user || userId !== user.id) throw new Error("Unauthorized");

  const eventsThatFallWithinRange: MongoVTodo[] = [];
  // Sadly we can't select the date range from the database because of recurrence logic
  const dateSelector = {
    $or: [
      { start: { $lte: end }, completed: { $exists: false } },
      { due: { $lte: end }, completed: { $exists: false } },
      { completed: { $gte: start, $lte: end } },
      { completed: { $exists: false } },
      { completed: undefined },
      { start: { $exists: false } },
      { start: undefined },
    ],
  } satisfies FilterOperators<Omit<VTodo, "recurrences">>;

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
      eventsThatFallWithinRange.push(
        omit({ ...todo, due: todo.due || todo.start }, "_id", "start"),
      );
    }
  }

  return eventsThatFallWithinRange.sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    return compareAsc(
      a.completed || a.due || a.start || a.created!,
      b.completed || b.due || b.start || b.created!,
    );
  });
}
