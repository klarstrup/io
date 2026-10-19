import { useApolloClient } from "@apollo/client/react";
import {
  faBoxesPacking,
  faExternalLink,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  differenceInDays,
  isBefore,
  isEqual,
  isPast,
  roundToNearestMinutes,
  type Interval,
} from "date-fns";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { use, useMemo, type ReactElement } from "react";
import { browser } from "react-dom";
import type {
  GQEvent,
  GQLocation,
  GQUser,
  GQWorkout,
} from "../../graphql.generated/graphql";
import type { LocationData } from "../../models/location";
import { WorkoutSource } from "../../models/workout";
import {
  cotemporality,
  dateToString,
  DEFAULT_TIMEZONE,
  emptyArray,
  isBeforeOrEqual,
  isSameDayButItRespectsDayStartHour,
  startOfDayButItRespectsDayStartHour,
} from "../../utils";
import { DiaryAgendaDayDueSet } from "./DiaryAgendaDayDueSet";
import { DiaryAgendaDayEntry } from "./DiaryAgendaDayEntry";
import { DiaryAgendaDayEvent } from "./DiaryAgendaDayEvent";
import { DiaryAgendaDayLocationChange } from "./DiaryAgendaDayLocationChange";
import { DiaryAgendaDayMeal } from "./DiaryAgendaDayMeal";
import { DiaryAgendaDayNow } from "./DiaryAgendaDayNow";
import DiaryAgendaDaySleep from "./DiaryAgendaDaySleep";
import { DiaryAgendaDayTodo } from "./DiaryAgendaDayTodo";
import { DiaryAgendaDayTrip } from "./DiaryAgendaDayTrip";
import { DiaryAgendaDayWorkout } from "./DiaryAgendaDayWorkout";
import { TodoSortableContext } from "./TodoDroppable";
import {
  doEntriesOverlapExactly,
  getJournalEntryPrincipalDate,
  isEntryThatCanHaveSeparatedEnd,
  isEventEntireDay,
  isSeparatedEnd,
  omitSeparatedEnd,
  type JournalEntry,
} from "./diaryUtils";
import gloryMaskPng from "./glory-mask.png";
import gloryPng from "./glory.png";

interface DayJournalEntryElement {
  id: string;
  element: ReactElement;
}

const emptyArrayFallback = (...args: JournalEntry[][]): JournalEntry[] => {
  for (const arg of args) if (arg.length) return arg;

  return emptyArray;
};

export function DiaryAgendaDayDayContents({
  now,
  date,
  dayRange,
  userTimeZone,
  dayLocations,
  dayJournalEntries,
  isLoadingEntries,
}: {
  now: Date;
  date?: `${number}-${number}-${number}`;
  dayRange: { start: Date; end: Date };
  userTimeZone?: GQUser["timeZone"];
  dayLocations: GQLocation[];
  dayJournalEntries: JournalEntry[];
  isSelectedDay?: boolean;
  isLoadingEntries?: boolean;
}) {
  use(browser());
  const router = useRouter();
  const client = useApolloClient();
  const timeZone = userTimeZone || DEFAULT_TIMEZONE;

  const dayJournalItems = useMemo(() => {
    const dayJournalEntryElements: DayJournalEntryElement[] = [];

    let i = 0;
    const entryIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding: string[] =
      [];

    let ownWorkouts = dayJournalEntries
      .filter((jE): jE is GQWorkout => jE.__typename === "Workout")
      .filter((w) => w.source === WorkoutSource.Self);
    if (!ownWorkouts.length) ownWorkouts = emptyArray;

    for (const journalEntry of dayJournalEntries) {
      const entryId =
        (isSeparatedEnd(journalEntry) ? "end-of-" : "") +
        (journalEntry.__typename !== "LocationChange" &&
        journalEntry.__typename !== "NowDivider"
          ? client.cache.identify(journalEntry)!
          : journalEntry.id);
      const principalDate = getJournalEntryPrincipalDate(journalEntry);

      const precedingJournalEntry = dayJournalEntries[i - 1];
      const followingJournalEntry = dayJournalEntries[i + 1];

      const previousEntries = dayJournalEntries
        .slice(0, i)
        .filter((je) => isEntryThatCanHaveSeparatedEnd(je));
      const followingEndOfEntries = dayJournalEntries
        .slice(i + 1)
        .filter((je) => isSeparatedEnd(je));

      let entriesThatSurroundsEntry = emptyArrayFallback(
        previousEntries
          .filter(
            (prevJE) =>
              (prevJE.__typename === "Event"
                ? prevJE.datetype !== "date" &&
                  !isEventEntireDay(prevJE, dayRange.start)
                : true) &&
              !entryIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding.includes(
                prevJE.id,
              ),
          )
          .filter((prevJE) =>
            followingEndOfEntries.some((endOfJE) => prevJE.id === endOfJE.id),
          )
          .reverse(),
        previousEntries
          .filter((je) =>
            je.__typename === "Event"
              ? je.datetype !== "date" && !isEventEntireDay(je, dayRange.start)
              : true,
          )
          .filter((je) => je.id !== journalEntry.id)
          .filter((je) => {
            const jePrincipalDate = getJournalEntryPrincipalDate(je);
            return (
              isBeforeOrEqual(jePrincipalDate.start, principalDate.start) &&
              isBefore(principalDate.end, jePrincipalDate.end)
            );
          })
          .reverse(), // Following end of event that doesn't have a surrounding start of event, which can happen if the event started on a previous day or if the start of the event was skipped because it was exactly at the same time as the end of the previous event
        followingEndOfEntries
          // followingEndOfEvent that has started(before today in this case) but doesn't have a surrounding start of event, which can happen if the event started on a previous day or if the start of the event was skipped because it was exactly at the same time as the end of the previous event)
          .filter((endOfJE) => {
            const endPrincipalDate = getJournalEntryPrincipalDate(
              omitSeparatedEnd(endOfJE),
            );
            return isBefore(endPrincipalDate.start, principalDate.start);
          }),
      );

      if (
        isSeparatedEnd(journalEntry) &&
        entriesThatSurroundsEntry?.length &&
        entriesThatSurroundsEntry.every((entryThatSurroundsEntry) =>
          doEntriesOverlapExactly(
            omitSeparatedEnd(journalEntry),
            entryThatSurroundsEntry,
          ),
        )
      ) {
        entriesThatSurroundsEntry = [];
      }

      const surroundingPrincipalDate = entriesThatSurroundsEntry?.length
        ? entriesThatSurroundsEntry.reduce(
            (acc: Interval<Date, Date> | null, je) => {
              const jePrincipalDate = getJournalEntryPrincipalDate(
                omitSeparatedEnd(je),
              );
              if (!acc) return jePrincipalDate;

              return {
                start:
                  jePrincipalDate.start <= acc.start
                    ? jePrincipalDate.start
                    : acc.start,
                end:
                  acc.end <= jePrincipalDate.end
                    ? jePrincipalDate.end
                    : acc.end,
              };
            },
            null,
          )
        : null;
      const cotemporalityOfSurroundingEntry = surroundingPrincipalDate
        ? cotemporality(surroundingPrincipalDate)
        : null;

      if (journalEntry.__typename === "NowDivider") {
        dayJournalEntryElements.push({
          id: entryId,
          element: (
            <DiaryAgendaDayNow
              key={entryId}
              date={date}
              timeZone={timeZone}
              now={journalEntry.start}
              nextEntryDate={
                (followingJournalEntry &&
                  getJournalEntryPrincipalDate(followingJournalEntry).start) ||
                null
              }
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
            />
          ),
        });
      } else if (journalEntry.__typename === "Sleep") {
        const sleep = journalEntry;

        dayJournalEntryElements.push({
          id: entryId,
          element: (
            <DiaryAgendaDaySleep
              key={entryId}
              sleep={sleep}
              userTimeZone={timeZone}
              principalDate={principalDate}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
              hasSeparatedEnd={!isSeparatedEnd(sleep)}
            />
          ),
        });
      } else if (journalEntry.__typename === "Event") {
        const event = journalEntry;

        const eventIsMoreThan24HoursAndWereOnADayInTheMiddleOfIt =
          isEventEntireDay(event, dayRange.start);

        const isAllDayEvent =
          event.datetype === "date" ||
          eventIsMoreThan24HoursAndWereOnADayInTheMiddleOfIt;

        if (isAllDayEvent) {
          // All-day events are handled separately in the DiaryAgendaDayDayAllDayEvents component, so we don't need to render them here.
        } else if (isSeparatedEnd(event)) {
          dayJournalEntryElements.push({
            id: entryId,
            element: (
              <DiaryAgendaDayEvent
                key={entryId}
                date={date}
                dayRange={dayRange}
                userTimeZone={timeZone}
                event={event}
                cotemporalityOfSurroundingEvent={
                  cotemporalityOfSurroundingEntry
                }
                isEntryWithSeparatedEnd={false}
              />
            ),
          });
        } else {
          const precedingEndOfEvent =
            precedingJournalEntry &&
            precedingJournalEntry.__typename === "Event" &&
            isSeparatedEnd(precedingJournalEntry)
              ? precedingJournalEntry
              : null;

          const entryHasSeparateEnd = dayJournalEntries
            .slice(i + 1)
            .some(
              (je): je is GQEvent => isSeparatedEnd(je) && je.id === event.id,
            );

          const startDay = startOfDayButItRespectsDayStartHour(event.start);
          const endDay = startOfDayButItRespectsDayStartHour(event.end);
          const days = differenceInDays(endDay, startDay) + 1;
          const dayNo = date && differenceInDays(dayRange.start, startDay);
          const isLastDay = dayNo === days;

          // If the preceding journal entry is the end of an event and it ends exactly when the current event starts, then we can treat them as a single continuous event instead of two separate events for the purpose of drawing the little bracket
          const isEntryEnd =
            Boolean(
              entryHasSeparateEnd &&
              precedingEndOfEvent &&
              roundToNearestMinutes(precedingEndOfEvent.end).getTime() ===
                event.start.getTime(),
            ) ||
            (dayNo !== undefined &&
              dayNo > 1 &&
              days > 1 &&
              isLastDay &&
              !entryHasSeparateEnd);

          if (precedingEndOfEvent && isEntryEnd) {
            entryIdsWhereTheEndWasSkippedSoItShouldNoLongerCountAsSurrounding.push(
              precedingEndOfEvent.id,
            );
          }

          dayJournalEntryElements.push({
            id: entryId,
            element: (
              <DiaryAgendaDayEvent
                key={entryId}
                date={date}
                dayRange={dayRange}
                userTimeZone={timeZone}
                event={event}
                isEntryWithSeparatedEnd={
                  (followingEndOfEntries.some(
                    (endOfEntry) => endOfEntry.id === event.id,
                  ) &&
                    (date
                      ? isEqual(
                          startOfDayButItRespectsDayStartHour(dayRange.start),
                          startOfDayButItRespectsDayStartHour(event.start),
                        )
                      : true)) ||
                  (date &&
                    !isSameDayButItRespectsDayStartHour(
                      event.start,
                      event.end,
                    ) &&
                    isEqual(
                      startOfDayButItRespectsDayStartHour(dayRange.start),
                      startOfDayButItRespectsDayStartHour(event.start),
                    ))
                }
                cotemporalityOfSurroundingEvent={
                  cotemporalityOfSurroundingEntry ||
                  (dayNo !== undefined &&
                  dayNo > 1 &&
                  days > 1 &&
                  entryHasSeparateEnd
                    ? cotemporality(event)
                    : null)
                }
              />
            ),
          });
        }
      } else if (journalEntry.__typename === "Todo") {
        const todo = journalEntry;
        dayJournalEntryElements.push({
          id: entryId,
          element: (
            <DiaryAgendaDayTodo
              todo={todo}
              key={entryId}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
              now={now}
              timeZone={timeZone}
            />
          ),
        });
      } else if ("exerciseSchedule" in journalEntry) {
        const dueSet = journalEntry;

        dayJournalEntryElements.push({
          id: entryId,
          element: (
            <DiaryAgendaDayDueSet
              key={entryId}
              dayRange={dayRange}
              dueSet={dueSet}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
              exerciseInfo={dueSet.exerciseSchedule.exerciseInfo}
              workouts={ownWorkouts}
              locations={dayLocations}
              timeZone={timeZone}
            />
          ),
        });
      } else if (journalEntry.__typename === "Workout") {
        const workout = journalEntry;

        const workoutDateStr = dateToString(
          startOfDayButItRespectsDayStartHour(workout.workedOutAt),
        );

        dayJournalEntryElements.push({
          id: entryId,
          element: (
            <DiaryAgendaDayWorkout
              key={entryId}
              location={
                dayLocations.find(
                  (loc) => loc.id === workout.locationId,
                ) as LocationData
              }
              workout={workout}
              workoutDateStr={workoutDateStr}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
              timeZone={timeZone}
            />
          ),
        });
      } else if (journalEntry.__typename === "LocationChange") {
        dayJournalEntryElements.push({
          id: entryId,
          element: (
            <DiaryAgendaDayLocationChange
              key={entryId}
              locationChange={journalEntry}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
              timeZone={timeZone}
            />
          ),
        });
      } else if (journalEntry.__typename === "Trip") {
        const trip = journalEntry;
        const isEndOfTrip = isSeparatedEnd(trip);

        const followingEntryIsEndOfTrip =
          followingJournalEntry &&
          followingJournalEntry.__typename === "Trip" &&
          isSeparatedEnd(followingJournalEntry) &&
          followingJournalEntry.id === trip.id;

        if (
          isEndOfTrip &&
          precedingJournalEntry?.__typename === "Trip" &&
          precedingJournalEntry.id === trip.id
        ) {
          // Skip rendering the separated end of the trip as it will be represented by the preceding entry
        } else {
          dayJournalEntryElements.push({
            id: entryId,
            element: (
              <DiaryAgendaDayTrip
                key={entryId}
                trip={trip}
                cotemporalityOfSurroundingEvent={
                  cotemporalityOfSurroundingEntry
                }
                isEntryWithSeparatedEnd={
                  !followingEntryIsEndOfTrip && !isEndOfTrip
                }
                timeZone={timeZone}
              />
            ),
          });
        }
      } else if (journalEntry.__typename === "Meal") {
        const meal = journalEntry;

        // skip if surrounding event has a location that is different from that of the meal
        if (
          meal.location && date
            ? entriesThatSurroundsEntry?.length &&
              entriesThatSurroundsEntry.every(
                (entryThatSurroundsEntry) =>
                  "location" in entryThatSurroundsEntry &&
                  entryThatSurroundsEntry.location &&
                  entryThatSurroundsEntry.location === meal.location,
              )
            : true
        ) {
          dayJournalEntryElements.push({
            id: entryId,
            element: (
              <DiaryAgendaDayMeal
                key={entryId}
                meal={meal}
                cotemporalityOfSurroundingEvent={
                  cotemporalityOfSurroundingEntry
                }
                timeZone={timeZone}
              />
            ),
          });
        }
      } else if (journalEntry.__typename === "Delivery") {
        const delivery = journalEntry;

        dayJournalEntryElements.push({
          id: entryId,
          element: (
            <DiaryAgendaDayEntry
              key={entryId}
              date={getJournalEntryPrincipalDate(delivery).start}
              userTimeZone={timeZone}
              entry={delivery}
              icon={faBoxesPacking}
              cotemporality={cotemporality({
                start: delivery.timestamp,
                end: delivery.timestamp,
              })}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
              className={"pr-0.5 pl-0.5 text-xs"}
              iconClassName="w-10 text-[0.666rem]"
            >
              <span className="flex items-stretch leading-snug">
                <div className="flex items-baseline gap-1 py-0.5">
                  <span>{delivery.status}</span>
                  {delivery.from ? (
                    <span className="text-[0.666rem] opacity-50">
                      from {delivery.from}
                    </span>
                  ) : null}
                  {delivery.url ? (
                    <a
                      href={delivery.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.666rem] text-[#edab00] hover:text-[#edab00]/80"
                    >
                      <FontAwesomeIcon icon={faExternalLink} />
                    </a>
                  ) : null}{" "}
                </div>
              </span>
            </DiaryAgendaDayEntry>
          ),
        });
      } else if (journalEntry.__typename === "Achievement") {
        const achievement = journalEntry;

        dayJournalEntryElements.push({
          id: entryId,
          element: (
            <DiaryAgendaDayEntry
              key={entryId}
              date={getJournalEntryPrincipalDate(achievement).start}
              userTimeZone={timeZone}
              entry={achievement}
              iconTxt={
                <Image
                  src={achievement.gameIcon}
                  alt={achievement.gameName}
                  width={48}
                  height={48}
                  style={{ width: 24, height: 24 }}
                  className="rounded-sm"
                />
              }
              cotemporality={cotemporality({
                start: achievement.unlockedAt,
                end: achievement.unlockedAt,
              })}
              cotemporalityOfSurroundingEvent={cotemporalityOfSurroundingEntry}
              onClick={() => {
                router.push(
                  `/diary/entries/${achievement.__typename}:${achievement.id}`,
                );
              }}
              contentClassName="flex items-center gap-2 leading-none"
            >
              <div
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    flexShrink: 0,
                    contain: "size",
                    aspectRatio: "1 / 1",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    display: "inline-block",
                    position: "relative",
                  }}
                >
                  {typeof achievement.globalPercentage === "number" &&
                  achievement.globalPercentage <= 10 ? (
                    <div
                      style={{
                        position: "absolute",
                        maskImage: `url(${gloryPng.src})`,
                        maskSize: "100% auto",
                        maskRepeat: "repeat",
                        inset: "-40%",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          maskSize: "100% auto",
                          maskRepeat: "repeat",
                          inset: "-40%",
                          overflow: "hidden",

                          animationName: "aeY3xSNbegI-",
                          animationDuration: "18s",
                          animationTimingFunction: "linear",
                          animationIterationCount: "infinite",
                          animationDirection: "reverse",
                          animationPlayState: "running",
                          maskImage: `url(${gloryMaskPng.src})`,
                        }}
                      >
                        <div
                          style={{
                            mixBlendMode: "overlay",
                            animationName: "aeY3xSNbegI-",
                            animationDuration: "6s",
                            animationTimingFunction: "linear",
                            animationIterationCount: "infinite",
                            animationPlayState: "running",
                            position: "absolute",
                            inset: "-10px",

                            background:
                              "repeating-conic-gradient(rgba(255, 217, 0, 0.176) 0%, rgba(255, 184, 78, 0) 6%, rgba(255, 217, 0, 0.176) 10%, rgb(255, 184, 78) 26%, rgba(255, 217, 0, 0.176) 35%, rgb(255, 184, 78) 40%, rgba(255, 217, 0, 0.176) 60%, rgb(255, 184, 78) 82%, rgba(255, 217, 0, 0.176) 100%)",
                            overflow: "hidden",
                          }}
                        ></div>
                      </div>
                    </div>
                  ) : null}
                  <div
                    style={{
                      // ::after
                      content: "",
                      width: "100%",
                      height: "100%",
                      display: "block",
                      position: "absolute",
                      top: "0px",
                      left: "0px",
                      boxShadow:
                        typeof achievement.globalPercentage === "number" &&
                        achievement.globalPercentage <= 10
                          ? "rgba(0, 0, 0, 0.5) 0px 0px 12px"
                          : undefined,
                      background:
                        "linear-gradient(90deg, rgb(59, 65, 74) 0%, rgb(44, 49, 56) 95%)",
                      borderRadius: "2px",
                    }}
                  />
                  <Image
                    loading="lazy"
                    alt={achievement.name}
                    src={achievement.icon}
                    width={64}
                    height={64}
                    style={{
                      boxShadow:
                        typeof achievement.globalPercentage === "number" &&
                        achievement.globalPercentage <= 10
                          ? "rgba(255, 184, 78, 0.6) 0px 0px 2px 1px, rgba(255, 184, 78, 0.4) 0px 0px 16px 1px"
                          : undefined,
                      // asd
                      verticalAlign: "top",
                      width: "100%",
                      minWidth: "100%",
                      maxWidth: "100%",
                      height: "100%",
                      minHeight: "100%",
                      maxHeight: "100%",
                      position: "relative",
                      transition: "transform 0.1s ease-in-out",
                      borderRadius: "2px",
                    }}
                  />
                </div>
              </div>
              <div>
                <span>{achievement.name}</span>{" "}
                {achievement.description ? (
                  <span className="text-[0.666rem] text-stone-500">
                    {achievement.description}
                  </span>
                ) : null}{" "}
                {achievement.url ? (
                  <a
                    href={achievement.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.666rem] text-[#edab00] hover:text-[#edab00]/80"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent the click from propagating to the parent div and triggering the onClick handler
                    }}
                  >
                    <FontAwesomeIcon icon={faExternalLink} />
                  </a>
                ) : null}
              </div>
            </DiaryAgendaDayEntry>
          ),
        });
      } else {
        journalEntry satisfies never;
      }

      i++;
    }

    return dayJournalEntryElements;
  }, [
    client.cache,
    date,
    dayJournalEntries,
    dayLocations,
    dayRange,
    now,
    router,
    timeZone,
  ]);

  return dayJournalItems.length ? (
    <TodoSortableContext items={dayJournalItems}>
      {dayJournalItems.map(({ element }) => element)}
    </TodoSortableContext>
  ) : (
    <div className={"pl-10 text-gray-400/50 italic"}>
      {isLoadingEntries
        ? "Loading..."
        : isPast(dayRange.end)
          ? "Nothing logged"
          : "Nothing planned"}
    </div>
  );
}
