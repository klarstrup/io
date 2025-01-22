import { tz, TZDate } from "@date-fns/tz";
import {
  addDays,
  differenceInHours,
  eachDayOfInterval,
  endOfDay,
  intervalToDuration,
  isAfter,
  max,
  min,
  startOfDay,
} from "date-fns";
import type { Session } from "next-auth";
import Popover from "../../components/Popover";
import { FieldSetX, FieldSetY } from "../../components/FieldSet";
import UserStuffSourcesForm from "../../components/UserStuffSourcesForm";
import type { MongoVEventWithVCalendar } from "../../lib";
import { getUserIcalEventsBetween } from "../../sources/ical";
import { dataSourceGroups } from "../../sources/utils";
import {
  dateToString,
  DEFAULT_TIMEZONE,
  isNonEmptyArray,
  roundToNearestDay,
  uniqueBy,
} from "../../utils";

export async function DiaryAgendaEvents({
  date,
  user,
  onlyGivenDay,
}: {
  date: `${number}-${number}-${number}`;
  user: Session["user"];
  onlyGivenDay?: boolean;
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const tzDate = new TZDate(date, timeZone);
  const now = TZDate.tz(timeZone);
  const todayStr = dateToString(now);
  const isToday = date === todayStr;

  const fetchingInterval = {
    start: startOfDay(tzDate),
    end: onlyGivenDay ? endOfDay(tzDate) : addDays(endOfDay(tzDate), 7),
  };
  const calendarEvents = await getUserIcalEventsBetween(
    user.id,
    fetchingInterval,
  );

  return (
    <FieldSetY
      className="min-w-[250px] flex-1"
      legend={
        <div className="flex items-center gap-2">
          <Popover control="📡">
            <div className="absolute left-4 top-4 z-30 max-h-[66vh] w-96 max-w-[80vw] overflow-auto overscroll-contain rounded-lg bg-[yellow] p-2 shadow-[yellow_0_0_20px]">
              <UserStuffSourcesForm
                user={user}
                sourceOptions={dataSourceGroups.events}
              />
            </div>
          </Popover>
          Events
        </div>
      }
    >
      {Object.entries(
        calendarEvents.reduce(
          (memo: Record<string, MongoVEventWithVCalendar[]>, event) => {
            for (const date of eachDayOfInterval(
              {
                start: max([
                  event.datetype === "date"
                    ? roundToNearestDay(event.start)
                    : event.start,
                  fetchingInterval.start,
                ]),
                end: min([
                  event.datetype === "date"
                    ? roundToNearestDay(event.end)
                    : event.end,
                  fetchingInterval.end,
                ]),
              },
              { in: tz(timeZone) },
            ).filter(
              (date) =>
                isAfter(event.end, isToday ? now : tzDate) &&
                differenceInHours(event.end, date) > 2,
            )) {
              const calName = dateToString(date);

              if (!memo[calName]) memo[calName] = [];
              if (
                !(
                  differenceInHours(event.end, event.start) < 24 &&
                  Object.values(memo).some((events) =>
                    events.some((e) => e.uid === event.uid),
                  )
                )
              ) {
                memo[calName].push(event);
              }
            }
            return memo;
          },
          { [date]: [] },
        ),
      )
        .slice(0, 4)
        .map(([dayName, events], i) => (
          <FieldSetX
            key={i}
            legend={
              !isToday
                ? new TZDate(dayName, timeZone).toLocaleDateString("da-DK")
                : todayStr === dayName
                  ? "Today"
                  : new TZDate(dayName, timeZone).toLocaleDateString("en-DK", {
                      weekday: "long",
                    })
            }
            className="w-full"
          >
            <ul>
              {isNonEmptyArray(events) ? (
                uniqueBy(events, ({ uid }) => uid).map((event) => {
                  const duration = intervalToDuration(event);

                  const days = eachDayOfInterval(event, {
                    in: tz(timeZone),
                  }).filter((date) => differenceInHours(event.end, date) > 2);
                  const dayNo =
                    days.findIndex((date) => dateToString(date) === dayName) +
                    1;
                  const isLastDay = dayNo === days.length;

                  return (
                    <li key={event.uid} className="flex gap-2">
                      <div className="text-center">
                        <div className="font-semibold tabular-nums leading-snug">
                          {event.datetype === "date-time" && dayNo === 1 ? (
                            event.start.toLocaleTimeString("en-DK", {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone,
                            })
                          ) : (
                            <>Day {dayNo}</>
                          )}{" "}
                        </div>
                        <div className="whitespace-nowrap text-[0.666rem] tabular-nums">
                          {dayNo === 1 ? (
                            <>
                              {duration.days ? `${duration.days}d` : null}
                              {duration.hours ? `${duration.hours}h` : null}
                              {duration.minutes ? `${duration.minutes}m` : null}
                              {duration.seconds ? `${duration.seconds}s` : null}
                            </>
                          ) : isLastDay ? (
                            <>
                              -
                              {event.end.toLocaleTimeString("en-DK", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone,
                              })}
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="leading-snug">{event.summary}</div>
                        <div className="text-[0.666rem] italic leading-tight">
                          {event.location || <>&nbsp;</>}
                        </div>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li>
                  <i>Nothing scheduled</i>
                </li>
              )}
            </ul>
          </FieldSetX>
        ))}
    </FieldSetY>
  );
}
