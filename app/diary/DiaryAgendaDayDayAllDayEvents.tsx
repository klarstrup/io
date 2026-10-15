import { useApolloClient } from "@apollo/client/react";
import { faCalendar as faCalendarRegular } from "@fortawesome/free-regular-svg-icons";
import {
  faBirthdayCake,
  faExternalLink,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { differenceInHours, isBefore, isPast } from "date-fns";
import { use, useMemo, type ReactElement } from "react";
import { browser } from "react-dom";
import type { GQUser } from "../../graphql.generated/graphql";
import {
  cotemporality,
  dateToString,
  DEFAULT_TIMEZONE,
  startOfDayButItRespectsDayStartHour,
} from "../../utils";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import {
  getJournalEntryPrincipalDate,
  isEventEntireDay,
  isSeparatedEnd,
  type JournalEntry,
} from "./diaryUtils";

interface DayJournalEntryElement {
  id: string;
  element: ReactElement;
}

const getJournalEntryPassed = (journalEntry: JournalEntry, now: Date) => {
  const principalDate = getJournalEntryPrincipalDate(journalEntry);
  return isBefore(principalDate.end, now);
};

export function DiaryAgendaDayDayAllDayEvents({
  now,
  date,
  dayRange,
  userTimeZone,
  dayJournalEntries,
  isSelectedDay,
}: {
  now: Date;
  date: `${number}-${number}-${number}`;
  dayRange: { start: Date; end: Date };
  userTimeZone?: GQUser["timeZone"];
  dayJournalEntries: JournalEntry[];
  isSelectedDay?: boolean;
}) {
  use(browser());
  const client = useApolloClient();
  const timeZone = userTimeZone || DEFAULT_TIMEZONE;
  const todayStr = useMemo(
    () => dateToString(startOfDayButItRespectsDayStartHour(now)),
    [now],
  );
  const isToday = date === todayStr;

  const allCompleted = dayJournalEntries.every((je) =>
    getJournalEntryPassed(je, now),
  );

  const allDayJournalItems = useMemo(() => {
    const allDayJournalEntryElements: DayJournalEntryElement[] = [];

    for (const journalEntry of dayJournalEntries) {
      const entryId =
        (isSeparatedEnd(journalEntry) ? "end-of-" : "") +
        (journalEntry.__typename !== "LocationChange" &&
        journalEntry.__typename !== "NowDivider"
          ? client.cache.identify(journalEntry)!
          : journalEntry.id);

      if (journalEntry.__typename === "Event") {
        const event = journalEntry;

        const eventIsMoreThan24HoursAndWereOnADayInTheMiddleOfIt =
          isEventEntireDay(event, dayRange.start);

        const isAllDayEvent =
          event.datetype === "date" ||
          eventIsMoreThan24HoursAndWereOnADayInTheMiddleOfIt;

        if (isAllDayEvent) {
          const dayNo =
            Math.floor(differenceInHours(dayRange.start, event.start) / 24) + 1;
          const numDays = Math.ceil(
            differenceInHours(event.end, event.start) / 24,
          );
          const isFirstDay = dayNo === 1;
          const isLastDay = dayNo === numDays;

          const isBirthday =
            event.summary?.toLowerCase().includes("birthday") ||
            event.summary?.toLowerCase().includes("bday") ||
            event.summary?.toLowerCase().includes("fødselsdag");

          allDayJournalEntryElements.push({
            id: entryId,
            element: (
              <DiaryAgendaDayEntry
                key={entryId}
                date={getJournalEntryPrincipalDate(event).start}
                entry={event}
                icon={isBirthday ? faBirthdayCake : faCalendarRegular}
                cotemporality={cotemporality(event)}
                userTimeZone={timeZone}
                className={
                  "relative z-5 self-end rounded-tl rounded-tr px-0.5 text-sm backdrop-blur-sm " +
                  (isSelectedDay
                    ? "bg-white/90"
                    : (isPast(dayRange.start) && allCompleted) ||
                        isPast(dayRange.end)
                      ? "bg-green-100/75"
                      : isToday
                        ? "bg-yellow-200/75"
                        : "bg-slate-100/75")
                }
                contentClassName="items-center"
                iconClassName="w-6 flex items-center gap-1 py-1 leading-none"
              >
                {numDays > 1 ? (
                  isFirstDay && event.datetype === "date-time" ? (
                    <>
                      {event.start.toLocaleTimeString("en-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone,
                      })}
                      -
                    </>
                  ) : isLastDay && event.datetype === "date-time" ? (
                    <>
                      -
                      {event.end.toLocaleTimeString("en-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone,
                      })}
                    </>
                  ) : null
                ) : null}
                <span>{event.summary}</span>
                {numDays > 1 ? (
                  <span className="flex items-baseline text-[0.555rem] whitespace-nowrap tabular-nums opacity-50">
                    <span className="px-px text-[0.777rem]">{dayNo}</span>
                    <span>/</span>
                    <span className="px-px">{numDays}d</span>
                  </span>
                ) : null}
                {event.url ? (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.666rem] text-[#edab00] hover:text-[#edab00]/80"
                  >
                    <FontAwesomeIcon icon={faExternalLink} />
                  </a>
                ) : null}
              </DiaryAgendaDayEntry>
            ),
          });
        }
      }
    }

    return allDayJournalEntryElements;
  }, [
    allCompleted,
    client.cache,
    dayJournalEntries,
    dayRange.end,
    dayRange.start,
    isSelectedDay,
    isToday,
    timeZone,
  ]);

  return allDayJournalItems.map(({ element }) => element);
}
