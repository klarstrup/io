import { TZDate, tzOffset } from "@date-fns/tz";
import { createHash } from "crypto";
import {
  addMinutes,
  addSeconds,
  areIntervalsOverlapping,
  differenceInSeconds,
  type Interval,
} from "date-fns";
import type { FilterOperators } from "mongodb";
import { RRule, RRuleSet } from "rrule";
import { auth } from "../auth";
import type { MongoVEvent, MongoVTodo } from "../lib";
import { omit } from "../utils";
import type { ProxyCollection } from "../utils.server";
import { proxyCollection } from "../utils.server";
import type { VEvent, VTodo } from "../vendor/ical";
import { DataSource, type UserDataSource } from "./utils";

export const IcalEvents = proxyCollection<MongoVEvent | MongoVTodo>(
  "ical_events",
);

export async function* getUserIcalEventsBetween(
  userId: string,
  { start, end }: Interval<Date, Date> | Interval<TZDate, TZDate>,
) {
  const user = (await auth())?.user;
  if (!user || userId !== user.id) throw new Error("Unauthorized");

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
    .reduce<
      Record<string, Extract<UserDataSource, { source: DataSource.ICal }>>
    >((acc, s) => {
      const hash = createHash("sha256")
        .update(s.config.url + user.id)
        .digest("hex");
      acc[hash] = s;
      return acc;
    }, {});

  for await (const event of (IcalEvents as ProxyCollection<MongoVEvent>).find(
    {
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
    },
    {
      projection: {
        summary: 1,
        description: 1,
        transparency: 1,
        datetype: 1,
        type: 1,
        url: 1,
        recurrences: 1,
        rrule: 1,
        exdate: 1,
        start: 1,
        end: 1,
        uid: 1,
        location: 1,
        _io_icalUrlHash: 1,
        _io_userId: 1,
        _io_scrapedAt: 1,
        _io_source: 1,
      },
    },
  )) {
    const dataSource = dataSourceByUrlHash?.[event._io_icalUrlHash!];

    if (dataSource?.config.url.includes("proprty.ai")) {
      // Company calendars often have no location set but they're nearly always at the office
      if (!event.location || event.location === "Big Ideas") {
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
            (sourceStartDate &&
              recurrence.end &&
              recurrence.end < sourceStartDate) ||
            recurrence.start.toJSON() === event.start.toJSON()
          ) {
            continue;
          }
          yield {
            ...recurrence,
            uid: `${recurrence.start.toLocaleDateString()}-${event.uid}`,
            _io_icalUrlHash: event._io_icalUrlHash,
            _io_userId: event._io_userId,
            _io_scrapedAt: event._io_scrapedAt,
            _io_source: event._io_source,
          };
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

      if (
        !event.exdate?.some(
          (exdate) => exdate.toJSON() === event.start.toJSON(),
        )
      ) {
        yield eventWithoutId;
      }
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
        // Subtract the event duration from the start of the interval to ensure we include events that start before the interval but end within it
        .between(addSeconds(start, -eventDurationSeconds), end, true)
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
          const rruleEventInstanceId = `${rruleDate.toLocaleDateString()}-${event.uid}`;

          if (rruleDate.toJSON() === event.start.toJSON()) continue;

          yield {
            ...eventWithoutId,
            uid: rruleEventInstanceId,
            start: rruleDate,
            end: rruleDateEnd,
          };
        }
      }
    }
  }
}

export async function* getUserIcalTodosBetween(
  userId: string,
  interval?: Interval<Date, Date> | Interval<TZDate, TZDate> | null,
) {
  const { start, end } = interval || {};
  const user = (await auth())?.user;
  if (!user || userId !== user.id) throw new Error("Unauthorized");

  // Sadly we can't select the date range from the database because of recurrence logic
  const dateSelector =
    start && end
      ? {
          $or: [
            { start: { $lte: end }, completed: { $exists: false } },
            { start: { $lte: end }, completed: null },
            { due: { $lte: end }, completed: { $exists: false } },
            { due: { $lte: end }, completed: null },
            { completed: { $gte: start, $lte: end } },
          ],
        }
      : ({
          $and: [
            { $or: [{ due: { $exists: false } }, { due: null }] },
            { $or: [{ completed: { $exists: false } }, { completed: null }] },
          ],
        } satisfies FilterOperators<Omit<VTodo, "recurrences">>);

  for await (const todo of (IcalEvents as ProxyCollection<MongoVTodo>).find(
    {
      _io_userId: userId,
      type: "VTODO",
      ...dateSelector,
    },
    {
      projection: {
        uid: 1,
        due: 1,
        created: 1,
        start: 1,
        completed: 1,
        summary: 1,
      },
    },
  )) {
    yield omit({ ...todo, due: todo.due || todo.start }, "_id", "start");
  }
}
