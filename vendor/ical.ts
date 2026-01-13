/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { TZDate, tzOffset } from "@date-fns/tz";
import { add, addDays, addMinutes, parse } from "date-fns";
import { RRule } from "rrule";
import { v4 as uuid } from "uuid";
import { isNonEmptyArray } from "../utils";
import * as zoneTable from "./windowsZones.json" with { type: "json" };

/** **************
 *  A tolerant, minimal icalendar parser
 *  (http://tools.ietf.org/html/rfc5545)
 *
 *  <peterbraden@peterbraden.co.uk>
 * ************* */

/**
 * Response objects
 */
export type NodeIcalCallback = (error: unknown, data: CalendarResponse) => void;

export type CalendarResponse = Record<string, CalendarComponent>;

export type CalendarComponent = VTimeZone | VEvent | VCalendar | VTodo;

export type VTimeZone = TimeZoneProps & TimeZoneDictionary;

interface TimeZoneProps extends BaseComponent {
  type: "VTIMEZONE";
  tzid: string;
  tzurl: string;
}

type TimeZoneDictionary = Record<string, TimeZoneDef | undefined>;

/**
 * Example :
 * TRIGGER:-P15M
 * TRIGGER;RELATED=END:P5M
 * TRIGGER;VALUE=DATE-TIME:19980101T050000Z
 */
type Trigger = string;

/**
 * https://www.kanzaki.com/docs/ical/valarm.html
 */
export interface VAlarm extends BaseComponent {
  type: "VALARM";
  action: "AUDIO" | "DISPLAY" | "EMAIL" | "PROCEDURE";
  trigger: Trigger;
  description?: string;
  /**
   * https://www.kanzaki.com/docs/ical/repeat.html
   */
  repeat?: number;
  /**
   * Time between repeated alarms (if repeat is set)
   * DURATION:PT15M
   */
  duration?: unknown;
  /**
   * Everything except DISPLAY
   * https://www.kanzaki.com/docs/ical/attach.html
   */
  attach: unknown;
  /**
   * For action = email
   */
  summary?: string;

  /**
   * For action = email1
   */
  attendee?: Attendee;
}

export interface VEvent extends BaseComponent {
  type: "VEVENT";
  method: Method;
  dtstamp: DateWithTimeZone;
  uid: string;
  sequence: string;
  transparency: Transparency;
  class: Class;
  summary: string;
  start: DateWithTimeZone;
  datetype: DateType;
  end: DateWithTimeZone;
  location: string;
  description: string;
  url: string;
  completion: string;
  created: DateWithTimeZone;
  lastmodified: DateWithTimeZone;
  rrule?: RRule;
  attendee?: Attendee[] | Attendee;
  recurrences?: Record<string, Omit<VEvent, "recurrences">>;
  status?: VEventStatus;
  categories?: string[];

  // I am not entirely sure about these, leave them as any for now..
  organizer: Organizer;
  exdate?: DateWithTimeZone[];
  geo?: { lat: number; lon: number };
  recurrenceid?: Date;

  alarms?: VAlarm[];

  // Custom io properties

  // Given multiple events at the same time, which order to show them in
  // lower number = higher priority
  order?: number | null;
}

export interface VTodo extends BaseComponent {
  uid: string;
  type: "VTODO";
  alarms?: VAlarm[];
  dtstamp: DateWithTimeZone;
  class?: Class;
  completed?: DateWithTimeZone | null;
  created?: DateWithTimeZone;
  description?: string;
  start?: DateWithTimeZone;
  geo?: { lat: number; lon: number };
  lastmodified?: DateWithTimeZone;
  organizer?: Organizer;
  percent?: number;
  recurrenceid?: Date;
  sequence?: string;
  recurrences?: Record<string, Omit<VTodo, "recurrences">>;
  status?: "NEEDS-ACTION" | "COMPLETED" | "IN-PROCESS" | "CANCELLED";
  summary?: string;
  url?: string;
  rrule?: RRule;
  due?: DateWithTimeZone;
  duration?: string; // dur-value
}

/**
 * Contains alls metadata of the Calendar
 */
export interface VCalendar extends BaseComponent {
  type: "VCALENDAR";
  prodid?: string;
  version?: string;
  calscale?: "GREGORIAN" | string;
  method?: Method;
  "WR-CALNAME"?: string;
  "WR-TIMEZONE"?: string;
}

export interface BaseComponent {
  params: unknown[];
}

export interface TimeZoneDef {
  type: "DAYLIGHT" | "STANDARD";
  params: unknown[];
  tzoffsetfrom: string;
  tzoffsetto: string;
  tzname: string;
  start: DateWithTimeZone;
  dateType: DateType;
  rrule: string;
  rdate: string | string[];
}

type Property<A> = PropertyWithArgs<A> | string;

interface PropertyWithArgs<A> {
  val: string;
  params: A & Record<string, unknown>;
}

export type Organizer = Property<{
  CN?: string;
}>;

export type Attendee = Property<{
  CUTYPE?: AttendeeCUType;
  ROLE?: AttendeeRole;
  PARTSTAT?: AttendeePartStat;
  RSVP?: boolean;
  CN?: string;
  "X-NUM-GUESTS"?: number;
}>;

export type AttendeeCUType =
  | "INDIVIDUAL"
  | "UNKNOWN"
  | "GROUP"
  | "ROOM"
  | string;
export type AttendeeRole =
  | "CHAIR"
  | "REQ-PARTICIPANT"
  | "NON-PARTICIPANT"
  | string;
export type AttendeePartStat =
  | "NEEDS-ACTION"
  | "ACCEPTED"
  | "DECLINED"
  | "TENTATIVE"
  | "DELEGATED";

export type DateWithTimeZone = Date & { tz?: string };
export type DateType = "date-time" | "date";
export type Transparency = "TRANSPARENT" | "OPAQUE";
export type Class = "PUBLIC" | "PRIVATE" | "CONFIDENTIAL";
export type Method =
  | "PUBLISH"
  | "REQUEST"
  | "REPLY"
  | "ADD"
  | "CANCEL"
  | "REFRESH"
  | "COUNTER"
  | "DECLINECOUNTER";
export type VEventStatus = "TENTATIVE" | "CONFIRMED" | "CANCELLED";

// Unescape Text re RFC 4.3.11
const text = (t = "") =>
  t
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\[nN]/g, "\n")
    .replace(/\\\\/g, "\\")
    .replace(/^"(.*)"$/, "$1");

const parseValue = (value: string) => {
  if (value === "TRUE") return true;

  if (value === "FALSE") return false;

  const number = Number(value);
  if (!Number.isNaN(number)) return number;

  // Remove quotes if found
  value = value.replace(/^"(.*)"$/, "$1");

  return value;
};

const parseParameters = (p: string[]) => {
  const out: Record<string, string | number | boolean> = {};
  for (const element of p) {
    if (element.includes("=")) {
      const [head, ...tail] = element.split("=");

      out[head!] = parseValue(tail.join("="));
    }
  }

  return out;
};

const storeValueParameter =
  (name: string) =>
  <Component extends BaseComponent | CalendarResponse>(
    value: Property<unknown> | DateWithTimeZone,
    curr: Component,
  ) => {
    const current = curr[name as keyof typeof curr];

    if (Array.isArray(current)) {
      current.push(value);
      return curr;
    }

    curr[name] =
      typeof current === "undefined" ? value : ([current, value] as const);

    return curr;
  };

const storeParameter =
  (name: string) =>
  <Component extends BaseComponent | CalendarResponse>(
    value: string,
    parameters: string[],
    curr: Component,
    _stack?: Record<string, CalendarComponent>[],
    _line?: string,
  ) => {
    const data: Property<unknown> =
      isNonEmptyArray(parameters) &&
      !(
        parameters.length === 1 &&
        (parameters[0] === "CHARSET=utf-8" || parameters[0] === "VALUE=TEXT")
      )
        ? { params: parseParameters(parameters), val: text(value) }
        : text(value);

    return storeValueParameter(name)(data, curr);
  };

const addTZ = (dt: DateWithTimeZone, parameters: string[]) => {
  // Date already has a timezone property
  if (dt?.tz) return dt;

  const p = parseParameters(parameters);
  if (parameters && p && dt && typeof p.TZID !== "undefined") {
    // Remove surrounding quotes if found at the beginning and at the end of the string
    // (Occurs when parsing Microsoft Exchange events containing TZID with Windows standard format instead IANA)
    dt.tz = p.TZID.toString().replace(/^"(.*)"$/, "$1");
  }

  // Bake the timezone into the date instead of relying on the tz property
  if (dt.tz) {
    const tz = dt.tz;
    dt = addMinutes(dt, -tzOffset(tz, dt));
    dt.tz = tz;
  }

  return dt;
};

const getIanaTZFromMS = (msTZName: keyof typeof zoneTable) => {
  // Get hash entry
  let he = zoneTable[msTZName];
  // Handle comma separated list, if we still don't have a match
  if (!he && msTZName.includes(",")) {
    // Just use the first string in name list
    const firstLocationName = msTZName.split(",")[0]!;
    // Loop thru the zonetable entries, save all that match
    const temporaryLookup = Object.keys(zoneTable).find((tzEntry) =>
      tzEntry.includes(firstLocationName),
    ) as keyof typeof zoneTable | undefined;

    // If we found any
    if (temporaryLookup) he = zoneTable[temporaryLookup];
  }

  // If found return iana name, else null
  return he ? he.iana[0] : null;
};

const getTimeZone = (value: string) => {
  let tz: string | undefined = value;
  let found: null | undefined | string = "";
  // If this is the custom timezone from MS Outlook
  if (
    tz === "tzone://Microsoft/Custom" ||
    tz.startsWith("Customized Time Zone") ||
    tz.startsWith("tzone://Microsoft/")
  ) {
    // Set it to the local timezone, because we can't tell
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  // Remove quotes if found
  tz = tz.replace(/^"(.*)"$/, "$1");

  // Watch out for windows timezones, or multiple with comma separatos
  if (tz && (tz.includes(" ") || tz.includes(","))) {
    const tz1 = getIanaTZFromMS(tz as keyof typeof zoneTable);
    if (tz1) tz = tz1;
  }

  // Watch out for offset timezones
  // If the conversion above didn't find any matching IANA tz
  // And offset is still present
  if (tz && tz.startsWith("(")) {
    // Extract just the offset
    const regex = /[+|-]\d*:\d*/;
    tz = undefined;
    found = tz!.match(regex)?.[0];
  }

  // Timezone not confirmed yet
  if (found === "")
    found = !Number.isNaN(tzOffset(tz!, new Date())) ? tz! : null;

  return found === "" ? tz : found;
};

const isDateOnly = (value: string, parameters: string[]) =>
  (parameters?.includes("VALUE=DATE") &&
    !parameters.includes("VALUE=DATE-TIME")) ||
  /^\d{8}$/.test(value) === true;

const typeParameter =
  (name: "datetype") =>
  (value: string, parameters: string[], curr: VEvent | VTimeZone) =>
    storeValueParameter(name)(
      isDateOnly(value, parameters) ? "date" : "date-time",
      curr,
    );
const dateParameter =
  (
    name:
      | "completed"
      | "exdate"
      | "start"
      | "end"
      | "created"
      | "lastmodified"
      | "dtstamp"
      | "recurrenceid"
      | "due",
  ) =>
  <Component extends BaseComponent | CalendarResponse>(
    value: string,
    parameters: string[],
    curr: Component,
    stack?: Record<string, CalendarComponent>[],
    _line?: string,
  ) => {
    const calendar = stack?.find(
      ({ type }) => type && typeof type === "string" && type === "VCALENDAR",
    ) as VCalendar | undefined;

    const calendarTimeZone = calendar?.["WR-TIMEZONE"];

    // The regex from main gets confused by extra :
    const pi = parameters.indexOf("TZID=tzone");
    if (pi >= 0) {
      // Correct the parameters with the part on the value
      parameters[pi] = parameters[pi] + ":" + value.split(":")[0];
      // Get the date from the field, other code uses the value parameter
      value = value.split(":")[1]!;
    }

    // Get the time zone from the stack
    const stackItemWithTimeZone = stack?.find((item) =>
      Object.values(item).find(
        (subItem): subItem is VTimeZone => subItem.type === "VTIMEZONE",
      ),
    );
    const vTimezone =
      stackItemWithTimeZone &&
      Object.values(stackItemWithTimeZone).find(
        (c): c is VTimeZone => c.type === "VTIMEZONE",
      );

    // If the VTIMEZONE contains multiple TZIDs (against RFC), use last one
    const normalizedTzId =
      vTimezone && "tzid" in vTimezone
        ? Array.isArray(vTimezone.tzid)
          ? vTimezone.tzid.slice(-1)[0]
          : vTimezone.tzid
        : null;

    let newDate: string | DateWithTimeZone = text(value);

    // Process 'VALUE=DATE' and EXDATE
    if (isDateOnly(value, parameters)) {
      // Just Date

      const comps = /^(\d{4})(\d{2})(\d{2}).*$/.exec(value);
      if (comps !== null) {
        const tz = normalizedTzId || calendarTimeZone;

        newDate = new TZDate(
          Number.parseInt(comps[1]!, 10),
          Number.parseInt(comps[2]!, 10) - 1,
          Number.parseInt(comps[3]!, 10),
          "UTC",
        );

        // Apply offset
        if (tz) newDate = addMinutes(newDate, -tzOffset(tz, newDate));

        newDate = newDate as DateWithTimeZone;
        newDate.tz = tz;

        return storeValueParameter(name)(addTZ(newDate, parameters), curr);
      }
    }

    // Typical RFC date-time format
    const comps = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(
      value,
    ) as
      | [
          unknown,
          string,
          string,
          string,
          string,
          string,
          string,
          string | undefined,
        ]
      | null;
    if (comps !== null) {
      const compsNumbers = comps
        .slice(1, 7)
        .map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))) as [
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      if (comps[7] === "Z") {
        // UTC
        newDate = new Date(Date.UTC(...compsNumbers)) as DateWithTimeZone;
        newDate.tz = "Etc/UTC";
      } else if (
        parameters[0]?.includes("TZID=") &&
        parameters[0].split("=")[1]
      ) {
        // Get the timezone from the parameters TZID value
        let tz: string | null = parameters[0].split("=")[1]!;
        let found = false;
        let offset: string | undefined | null = "";

        // If this is the custom timezone from MS Outlook
        if (
          tz === "tzone://Microsoft/Custom" ||
          tz === "(no TZ description)" ||
          tz.startsWith("Customized Time Zone") ||
          tz.startsWith("tzone://Microsoft/")
        ) {
          // Set it to the local timezone, because we can't tell
          tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          parameters[0] = "TZID=" + tz;
        }

        // Remove quotes if found
        tz = tz.replace(/^"(.*)"$/, "$1");

        // Watch out for windows timezones
        if (tz && (tz.includes(" ") || tz.includes(","))) {
          const tz1 = getTimeZone(tz);
          if (tz1) {
            tz = tz1;
            // We have a confirmed timezone, don't use offset, may confuse DST/STD time
            offset = "";
            // Fix the parameters for later use
            parameters[0] = "TZID=" + tz;
          }
        }

        // Watch out for offset timezones
        // If the conversion above didn't find any matching IANA tz
        // And offset is still present
        if (tz?.startsWith("(")) {
          // Extract just the offset
          const regex = /[+|-]\d*:\d*/;
          offset = tz.match(regex)?.[0];
          tz = null;
          found = Boolean(offset);
        }

        // Timezone not confirmed yet
        if (!found) found = !Number.isNaN(tzOffset(tz!, new Date()));

        // Timezone confirmed or forced to offset
        newDate =
          found && tz
            ? parse(value, "yyyyMMdd'T'HHmmss" + offset, TZDate.tz(tz))
            : (new Date(...compsNumbers) as DateWithTimeZone);
        if (found && tz) newDate.tz = tz;
      } else {
        newDate =
          normalizedTzId && !Number.isNaN(tzOffset(normalizedTzId, new Date()))
            ? parse(value, "yyyyMMdd'T'HHmmss", TZDate.tz(normalizedTzId))
            : (new Date(...compsNumbers) as DateWithTimeZone);
        if (normalizedTzId) newDate.tz = normalizedTzId;
      }
    }

    // Store as string - worst case scenario
    return storeValueParameter(name)(
      addTZ(newDate as DateWithTimeZone, parameters),
      curr,
    );
  };

const geoParameter =
  (_name: "geo") =>
  (
    value: string,
    _parameters: string[],
    curr: VEvent,
    _stack?: CalendarComponent[],
    _line?: string,
  ) => {
    const parts = value.split(";");
    curr.geo = { lat: Number(parts[0]), lon: Number(parts[1]) };
    return curr;
  };

const categoriesParameter =
  (_name: "categories") =>
  (
    value: string,
    parameters: string[],
    curr: VEvent,
    _stack: CalendarComponent[],
    _line: string,
  ) => {
    storeParameter("categories")(value, parameters, curr);
    if (curr.categories === undefined) {
      curr.categories = value ? value.split(",").map((s) => s.trim()) : [];
    } else if (value) {
      curr.categories = curr.categories.concat(
        value.split(",").map((s) => s.trim()),
      );
    }

    return curr;
  };

// EXDATE is an entry that represents exceptions to a recurrence rule (ex: "repeat every day except on 7/4").
// The EXDATE entry itself can also contain a comma-separated list, so we make sure to parse each date out separately.
// There can also be more than one EXDATE entries in a calendar record.
// Since there can be multiple dates, we create an array of them.  The index into the array is the ISO string of the date itself, for ease of use.
// i.e. You can check if ((curr.exdate != undefined) && (curr.exdate[date iso string] != undefined)) to see if a date is an exception.
// NOTE: This specifically uses date only, and not time.  This is to avoid a few problems:
//    1. The ISO string with time wouldn't work for "floating dates" (dates without timezones).
//       ex: "20171225T060000" - this is supposed to mean 6 AM in whatever timezone you're currently in
//    2. Daylight savings time potentially affects the time you would need to look up
//    3. Some EXDATE entries in the wild seem to have times different from the recurrence rule, but are still excluded by calendar programs.  Not sure how or why.
//       These would fail any sort of sane time lookup, because the time literally doesn't match the event.  So we'll ignore time and just use date.
//       ex: DTSTART:20170814T140000Z
//             RRULE:FREQ=WEEKLY;WKST=SU;INTERVAL=2;BYDAY=MO,TU
//             EXDATE:20171219T060000
//       Even though "T060000" doesn't match or overlap "T1400000Z", it's still supposed to be excluded?  Odd. :(
// TODO: See if this causes any problems with events that recur multiple times a day.
const exdateParameter =
  (name: "exdate") =>
  (
    value: string,
    parameters: string[],
    curr: VEvent,
    stack?: Record<string, CalendarComponent>[],
    _line?: string,
  ) => {
    curr.exdate = curr.exdate || [];
    const dates = value ? value.split(",").map((s) => s.trim()) : [];
    for (const entry of dates) {
      const exdate = {};
      dateParameter(name)(entry, parameters, exdate, stack);

      const exdateDate = exdate[name] as DateWithTimeZone | undefined;
      if (exdateDate) {
        if (
          "toISOString" in exdateDate &&
          typeof exdateDate.toISOString === "function"
        ) {
          curr.exdate[exdateDate.toISOString().slice(0, 10)] = exdateDate;
        } else {
          throw new TypeError(
            "No toISOString function in exdate[name]",
            //@ts-expect-error -- asd
            exdateDate,
          );
        }
      }
    }

    return curr;
  };

const objectHandlers = {
  BEGIN(
    component: "VCALENDAR" | "VEVENT" | "VALARM" | "VTIMEZONE" | "VTODO",
    parameters: string[],
    curr: CalendarComponent,
    stack: CalendarComponent[],
    _line?: string,
  ) {
    stack.push(curr);

    return { type: component, params: parameters };
  },
  END(
    value: string,
    parameters: string[],
    curr: CalendarComponent | VAlarm,
    stack: (CalendarComponent | VAlarm)[],
    _line?: string,
  ) {
    // Original end function
    const originalEnd = (
      component: string,
      _parameters_: string[],
      curr: CalendarComponent | VAlarm,
      stack: (CalendarComponent | VAlarm)[],
      _line?: string,
    ) => {
      // Prevents the need to search the root of the tree for the VCALENDAR object
      if (component === "VCALENDAR") {
        curr = curr as VCalendar;
        // Scan all high level object in curr and drop all strings
        const highLevel = {};
        for (const key of Object.keys(curr)) {
          const object = curr[key as keyof typeof curr];
          if (typeof object === "string") {
            highLevel[key] = object;
            delete curr[key];
          }
        }

        if (
          "type" in highLevel &&
          highLevel.type &&
          typeof highLevel.type === "string"
        ) {
          curr[highLevel.type.toLowerCase()] = highLevel;
        }
        return curr;
      }
      curr = curr as VEvent;

      const parent = stack.pop()!;

      if (!curr.end) {
        // RFC5545, 3.6.1
        // Set the end according to the datetype of event
        curr.end =
          curr.datetype === "date-time"
            ? new Date(curr.start.getTime())
            : addDays(curr.start, 1);

        // If there was a duration specified
        if ("duration" in curr && typeof curr.duration === "string") {
          const durationUnits = {
            // Y: 'years',
            // M: 'months',
            W: "weeks",
            D: "days",
            H: "hours",
            M: "minutes",
            S: "seconds",
          } as const;
          // Get the list of duration elements
          const r = String(curr.duration.match(/-?\d{1,10}[YMWDHS]/g));

          // Use the duration to create the end value, from the start
          // Is the 1st character a negative sign?
          const indicator = curr.duration.startsWith("-") ? -1 : 1;
          curr.end = add(curr.start, {
            [durationUnits[
              r.toString().slice(-1) as keyof typeof durationUnits
            ]]: Number.parseInt(r, 10) * indicator,
          });
          console.log("Duration applied, new end:", curr.end);
        }
      }

      if (curr.uid) {
        // If this is the first time we run into this UID, just save it.
        if (parent[curr.uid] === undefined) {
          parent[curr.uid] = curr;

          // RFC5545, 3.2
          if ("method" in parent && parent.method) {
            (parent[curr.uid] as typeof curr).method = (
              parent as VCalendar
            ).method!;
          }
        } else if (curr.recurrenceid === undefined) {
          // If we have multiple ical entries with the same UID, it's either going to be a
          // modification to a recurrence (RECURRENCE-ID), and/or a significant modification
          // to the entry (SEQUENCE).

          // TODO: Look into proper sequence logic.

          // If we have the same UID as an existing record, and it *isn't* a specific recurrence ID,
          // not quite sure what the correct behaviour should be.  For now, just take the new information
          // and merge it with the old record by overwriting only the fields that appear in the new record.
          for (const key of Object.keys(curr)) {
            (parent[curr.uid] as typeof curr)[key] =
              curr[key as keyof typeof curr];
          }
        }

        // If we have recurrence-id entries, list them as an array of recurrences keyed off of recurrence-id.
        // To use - as you're running through the dates of an rrule, you can try looking it up in the recurrences
        // array.  If it exists, then use the data from the calendar object in the recurrence instead of the parent
        // for that day.

        // NOTE:  Sometimes the RECURRENCE-ID record will show up *before* the record with the RRULE entry.  In that
        // case, what happens is that the RECURRENCE-ID record ends up becoming both the parent record and an entry
        // in the recurrences array, and then when we process the RRULE entry later it overwrites the appropriate
        // fields in the parent record.

        if (typeof curr.recurrenceid !== "undefined") {
          // TODO:  Is there ever a case where we have to worry about overwriting an existing entry here?

          // Create a copy of the current object to save in our recurrences array.  (We *could* just do par = curr,
          // except for the case that we get the RECURRENCE-ID record before the RRULE record.  In that case, we
          // would end up with a shared reference that would cause us to overwrite *both* records at the point
          // that we try and fix up the parent record.)
          const recurrenceObject = {};
          for (const key of Object.keys(curr)) {
            recurrenceObject[key] = curr[key as keyof typeof curr];
          }

          if (
            "recurrences" in recurrenceObject &&
            typeof recurrenceObject.recurrences !== "undefined"
          ) {
            delete recurrenceObject.recurrences;
          }

          // If we don't have an array to store recurrences in yet, create it.
          if ((parent[curr.uid] as typeof curr).recurrences === undefined) {
            (parent[curr.uid] as typeof curr).recurrences = {};
          }
          // Save off our cloned recurrence object into the array, keyed by date but not time.
          // We key by date only to avoid timezone and "floating time" problems (where the time isn't associated with a timezone).
          // TODO: See if this causes a problem with events that have multiple recurrences per day.
          if (
            curr.recurrenceid instanceof Date &&
            "recurrences" in parent[curr.uid]! &&
            typeof (parent[curr.uid] as typeof curr).recurrences === "object"
          ) {
            // @ts-expect-error - don't care
            (parent[curr.uid] as typeof curr).recurrences![
              curr.recurrenceid
                .toISOString()
                .slice(0, 10) as keyof (typeof curr)["recurrences"]
            ] = recurrenceObject;
          } else {
            // Removed issue 56
            throw new TypeError(
              "No toISOString function in curr.recurrenceid",
              // @ts-expect-error - don't care
              curr.recurrenceid,
            );
          }
        }

        // One more specific fix - in the case that an RRULE entry shows up after a RECURRENCE-ID entry,
        // let's make sure to clear the recurrenceid off the parent field.
        if (
          curr.uid !== "__proto__" &&
          typeof (parent[curr.uid] as typeof curr).rrule !== "undefined" &&
          "recurrenceid" in (parent[curr.uid] as typeof curr) &&
          typeof (parent[curr.uid] as typeof curr).recurrenceid !== "undefined"
        ) {
          delete (parent[curr.uid] as typeof curr).recurrenceid;
        }
      } else if (
        component === "VALARM" &&
        (parent.type === "VEVENT" || parent.type === "VTODO")
      ) {
        curr = curr as unknown as VAlarm;
        parent.alarms ??= [];
        parent.alarms.push(curr);
      } else {
        const id: string = uuid();
        parent[id] = curr as BaseComponent;

        // RFC5545, 3.2
        if ("method" in parent && parent.method)
          (parent[id] as VCalendar).method = (parent as VCalendar).method;
      }

      return parent;
    };

    // Recurrence rules are only valid for VEVENT, VTODO, and VJOURNAL.
    // More specifically, we need to filter the VCALENDAR type because we might end up with a defined rrule
    // due to the subtypes.

    if (
      (value === "VEVENT" || value === "VTODO" || value === "VJOURNAL") &&
      "rrule" in curr
    ) {
      curr = curr as VEvent;
      let rule = (curr.rrule as unknown as string).replace("RRULE:", "");
      // Make sure the rrule starts with FREQ=
      rule = rule.slice(rule.lastIndexOf("FREQ="));
      // If no rule start date
      if (rule.includes("DTSTART") === false) {
        // Get date/time into a specific format for comapare
        // If the date has an toISOString function
        if (curr.start && typeof curr.start.toISOString === "function") {
          try {
            let timeString = curr.start.toISOString().replace(/[-:]/g, "");
            // If the original date has a TZID, add it
            if (curr.start.tz) {
              const tz = getTimeZone(curr.start.tz!)!;
              const tzDate = new Date(curr.start);
              timeString = tzDate.toISOString().replace(/[-:]/g, "");

              rule += `;DTSTART;TZID=${tz}:${timeString}`;
            } else {
              rule += `;DTSTART=${timeString}`;
            }

            // TODO: Format the date right from the start
            rule = rule.replace(/\.\d{3}/, "");
            rule = rule.replace(/Z$/, "");
          } catch (error) {
            // This should not happen, issue #56
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            throw new Error("ERROR when trying to convert to ISOString", error);
          }
        } else {
          // @ts-expect-error - don't care
          throw new Error("No toISOString function in curr.start", curr.start);
        }
      }

      curr.rrule = RRule.fromString(rule);

      // Hack to fix BYMONTHDAY if it doesn't match the start date because
      // the dtstart was shifted to be in UTC time
      if (
        curr.rrule.origOptions.bymonthday &&
        curr.rrule.origOptions.dtstart?.getUTCDate() !==
          curr.rrule.origOptions.bymonthday
      ) {
        curr.rrule.origOptions.bymonthday =
          curr.rrule.origOptions.dtstart?.getUTCDate()!;

        curr.rrule = new RRule(curr.rrule.origOptions);
      }
    }

    return originalEnd(value, parameters, curr, stack);
  },
  SUMMARY: storeParameter("summary"),
  DESCRIPTION: storeParameter("description"),
  URL: storeParameter("url"),
  UID: storeParameter("uid"),
  LOCATION: storeParameter("location"),
  DTSTART: (
    value: string,
    parameters: string[],
    curr: VEvent | VTimeZone,
    stack: Record<string, CalendarComponent>[],
    _line?: string,
  ) =>
    typeParameter("datetype")(
      value,
      parameters,
      dateParameter("start")(value, parameters, curr, stack),
    ),
  DTEND: dateParameter("end"),
  EXDATE: exdateParameter("exdate"),
  CLASS: storeParameter("class"), // Should there be a space in this property?
  TRANSP: storeParameter("transparency"),
  GEO: geoParameter("geo"),
  "PERCENT-COMPLETE": storeParameter("percent"),
  COMPLETED: dateParameter("completed"),
  CATEGORIES: categoriesParameter("categories"),
  DTSTAMP: dateParameter("dtstamp"),
  CREATED: dateParameter("created"),
  DUE: dateParameter("due"),
  "LAST-MODIFIED": dateParameter("lastmodified"),
  "RECURRENCE-ID": dateParameter("recurrenceid"),
  RRULE(
    _value: string,
    _parameters: string[],
    curr: VEvent,
    _stack: CalendarComponent[],
    line: string,
  ) {
    curr.rrule = line as unknown as RRule; // This is a string, but it will be converted to an RRule object later in the END handler
    return curr;
  },
} as const;

function handleObject(
  name: string,
  value: string,
  parameters: string[],
  ctx: CalendarResponse,
  stack: CalendarResponse[],
  line: string,
): CalendarResponse {
  if (name in objectHandlers) {
    const objectHandler = objectHandlers[name as keyof typeof objectHandlers];
    // @ts-expect-error - this is the rat king
    return objectHandler(value, parameters, ctx, stack, line);
  }

  // Handling custom properties
  if (/X-[\w-]+/.test(name) && stack.length > 0) {
    // Trimming the leading and perform storeParam
    return storeParameter(name.slice(2))(value, parameters, ctx);
  }

  return storeParameter(name.toLowerCase())(value, parameters, ctx);
}

function parseLines(
  lines: string[],
  limit: number,
  ctx: CalendarResponse = {},
  stack: CalendarResponse[] = [],
  lastIndex: number = 0,
): CalendarResponse {
  let limitCounter = 0;

  let i = lastIndex;
  for (let ii = lines.length; i < ii; i++) {
    let l = lines[i]!;
    // Unfold : RFC#3.1
    while (lines[i + 1] && /[ \t]/.test(lines[i + 1]![0]!)) {
      l += lines[i + 1]!.slice(1);
      i++;
    }

    // Remove any double quotes in any tzid statement// except around (utc+hh:mm
    if (l.includes("TZID=") && !l.includes('"(')) l = l.replace(/"/g, "");

    const exp = /^([\w\d-]+)((?:;[\w\d-]+=(?:(?:"[^"]*")|[^":;]+))*):(.*)$/;
    let kv: string[] | null = l.match(exp);

    // Invalid line - must have k&v
    if (kv === null) continue;

    kv = kv.slice(1);

    const value = kv[kv.length - 1]!;
    const name = kv[0]!;
    const parameters = kv[1] ? kv[1].split(";").slice(1) : [];

    ctx = handleObject(name, value, parameters, ctx, stack, l) || {};
    if (++limitCounter > limit) break;
  }

  if (i >= lines.length) {
    // Type and params are added to the list of items, get rid of them.
    delete ctx.type;
    delete ctx.params;
  }

  return ctx;
}

export function parseICS(string: string): CalendarResponse {
  const lines = string.split(/\r?\n/);

  return parseLines(lines, lines.length);
}
