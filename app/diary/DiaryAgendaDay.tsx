import { tz, TZDate } from "@date-fns/tz";
import {
  addDays,
  addHours,
  compareAsc,
  eachDayOfInterval,
  endOfDay,
  isAfter,
  isBefore,
  isFuture,
  isPast,
  max,
  min,
  startOfDay,
  subHours,
} from "date-fns";
import { gql } from "graphql-tag";
import { ObjectId } from "mongodb";
import type { Session } from "next-auth";
import { query } from "../../ApolloClient";
import {
  DiaryAgendaDayUserTodosQuery,
  Event,
  type Todo,
} from "../../graphql.generated";
import { Locations } from "../../models/location.server";
import { isNextSetDue, WorkoutSource } from "../../models/workout";
import { getNextSets } from "../../models/workout.server";
import {
  dateToString,
  dayStartHour,
  DEFAULT_TIMEZONE,
  roundToNearestDay,
  unique,
} from "../../utils";
import { DiaryAgendaDayDay } from "./DiaryAgendaDayDay";
import { TodoDroppable } from "./TodoDroppable";
import { getJournalEntryPrincipalDate } from "./diaryUtils";

export async function DiaryAgendaDay({
  date,
  user,
}: {
  date: `${number}-${number}-${number}`;
  user?: Session["user"];
}) {
  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const tzDate = new TZDate(date, timeZone);

  const fetchingInterval = {
    start: addHours(addDays(startOfDay(tzDate), -4), dayStartHour),
    end: addHours(addDays(endOfDay(tzDate), 10), dayStartHour),
  };
  const [userData, nextSets = []] = user
    ? await Promise.all([
        query<DiaryAgendaDayUserTodosQuery>({
          query: gql`
            query DiaryAgendaDayUserTodos($interval: IntervalInput!) {
              user {
                id
                todos(interval: $interval) {
                  id
                  created
                  summary
                  start
                  due
                  completed
                  order
                }
                events(interval: $interval) {
                  id
                  created
                  summary
                  start
                  end
                  datetype
                  location
                  order
                }
                workouts(interval: $interval) {
                  id
                  createdAt
                  updatedAt
                  workedOutAt
                  materializedAt
                  locationId
                  source
                  exercises {
                    exerciseId
                    displayName
                    comment
                    sets {
                      comment
                      createdAt
                      updatedAt
                      inputs {
                        unit
                        value
                        assistType
                      }
                      meta {
                        key
                        value
                      }
                    }
                  }
                }
              }
            }
          `,
          variables: { interval: fetchingInterval },
        }).then((res) => ({
          calendarTodos: res.data?.user?.todos || [],
          calendarEvents: res.data?.user?.events || [],
          workouts: res.data?.user?.workouts || [],
        })),
        getNextSets({ user, to: fetchingInterval.end }),
      ])
    : [];

  const {
    calendarEvents = [],
    calendarTodos = [],
    workouts = [],
  } = userData || {};

  const eventsByDate: Record<string, Event[]> = {};
  const todosByDate: Record<string, Todo[]> = {};
  const dueSetsByDate: Record<
    string,
    Awaited<ReturnType<typeof getNextSets>>
  > = { [date]: [] };

  const daysOfInterval = eachDayOfInterval(fetchingInterval).filter(
    (date) => addHours(date, dayStartHour) <= fetchingInterval.end,
  );
  for (const date of daysOfInterval) {
    const dayEnd = addHours(endOfDay(date), dayStartHour);
    const dueSets = nextSets.filter(
      (nextSet) => isFuture(dayEnd) && isNextSetDue(date, nextSet),
    );
    const calName = dateToString(date);

    for (const dueSet of dueSets) {
      if (
        Object.values(dueSetsByDate)
          .flat()
          .some((e) => e.scheduleEntry.id === dueSet.scheduleEntry.id)
      ) {
        continue;
      }
      if (!dueSetsByDate[calName]) dueSetsByDate[calName] = [];
      dueSetsByDate[calName].push(dueSet);
    }
  }

  for (const event of calendarEvents) {
    for (const date of eachDayOfInterval(
      {
        start: max(
          [
            subHours(
              max(
                [
                  "datetype" in event && event.datetype === "date"
                    ? roundToNearestDay(event.start, {
                        in: tz(DEFAULT_TIMEZONE),
                      })
                    : null,

                  "completed" in event ? event.completed : null,
                  "due" in event ? event.due : null,
                  "start" in event ? event.start : null,
                  fetchingInterval.start,
                ].filter(Boolean),
              ),
              dayStartHour,
            ),
            fetchingInterval.start,
          ].filter(Boolean),
        ),
        end: min(
          [
            subHours(
              min(
                [
                  "datetype" in event && event.datetype === "date"
                    ? roundToNearestDay(event.end, {
                        in: tz(DEFAULT_TIMEZONE),
                      })
                    : null,
                  "completed" in event ? event.completed : null,
                  "due" in event ? event.due : null,
                  "end" in event ? event.end : null,
                  fetchingInterval.end,
                ].filter(Boolean),
              ),
              dayStartHour,
            ),
            fetchingInterval.end,
          ].filter(Boolean),
        ),
      },
      { in: tz(timeZone) },
    )) {
      const dayStart = addHours(startOfDay(date), dayStartHour);
      const dayEnd = addHours(endOfDay(date), dayStartHour);

      const calName = dateToString(addHours(date, dayStartHour));

      if (event.datetype === "date") {
        if (
          isBefore(dayEnd, addHours(event.start, dayStartHour)) ||
          isAfter(dayStart, addHours(event.end, dayStartHour))
        ) {
          continue;
        }
      }

      if (!eventsByDate[calName]) eventsByDate[calName] = [];
      if (eventsByDate[calName].includes(event)) continue;
      eventsByDate[calName].push(event);
    }
  }

  for (const todo of calendarTodos) {
    for (const date of eachDayOfInterval(
      {
        start: subHours(
          max(
            [
              todo.completed || todo.due,
              todo.completed || todo.start,
              fetchingInterval.start,
            ].filter(Boolean),
          ),
          dayStartHour,
        ),
        end: subHours(fetchingInterval.end, dayStartHour),
      },
      { in: tz(timeZone) },
    )) {
      const dayEnd = addHours(endOfDay(date), dayStartHour);

      const calName = dateToString(addHours(date, dayStartHour));
      if (!todo.start && !todo.due && !todo.completed) {
        // If not done and no start or due date, this is a backlog item
        // we don't show in the diary
        continue;
      }
      if (
        (isPast(dayEnd) && !todo.completed) ||
        Object.values(todosByDate)
          .flat()
          .some((e) => e.id === todo.id)
      ) {
        continue;
      }
      if (!todosByDate[calName]) todosByDate[calName] = [];
      todosByDate[calName].push(todo);
    }
  }

  return (
    <div className="flex flex-col items-stretch justify-start">
      {await Promise.all(
        daysOfInterval.map(async (dayDate, dayI) => {
          const dayStart = addHours(startOfDay(dayDate), dayStartHour);
          const dayEnd = addHours(endOfDay(dayDate), dayStartHour);

          const dayEvents = eventsByDate[dateToString(dayDate)] || [];
          const dayName = dateToString(dayDate);
          const dayWorkouts = workouts.filter((workout) =>
            workout.source === WorkoutSource.Self
              ? workout.workedOutAt >= startOfDay(dayDate) &&
                workout.workedOutAt <= endOfDay(dayDate)
              : workout.workedOutAt >= dayStart &&
                workout.workedOutAt <= dayEnd,
          );

          const dayWorkoutLocationObjectIds = unique(
            dayWorkouts.map((workout) => workout.locationId),
          )
            .map((id) => id && new ObjectId(id))
            .filter(Boolean);
          const dayLocations = dayWorkoutLocationObjectIds.length
            ? await Locations.find({
                _id: { $in: dayWorkoutLocationObjectIds },
              }).toArray()
            : [];

          const dayDueSets = dueSetsByDate[dayName] || [];
          const dayTodos = todosByDate[dayName] || [];

          return (
            <TodoDroppable key={dayI} date={dayDate}>
              <DiaryAgendaDayDay
                date={dayName}
                dayDate={dayDate}
                user={user}
                dayLocations={dayLocations}
                dayJournalEntries={[
                  ...dayEvents,
                  ...dayDueSets,
                  ...dayTodos,
                  ...dayWorkouts,
                ]
                  .sort((a, b) => {
                    const aOrder =
                      "scheduleEntry" in a
                        ? (a.scheduleEntry.order ?? 0)
                        : "order" in a
                          ? (a.order ?? 0)
                          : 0;
                    const bOrder =
                      "scheduleEntry" in b
                        ? (b.scheduleEntry.order ?? 0)
                        : "order" in b
                          ? (b.order ?? 0)
                          : 0;
                    return aOrder - bOrder;
                  })
                  .sort((a, b) =>
                    compareAsc(
                      "__typename" in a &&
                        a.__typename === "Event" &&
                        a.datetype === "date"
                        ? 1
                        : getJournalEntryPrincipalDate(a) || new Date(0),
                      "__typename" in b &&
                        b.__typename === "Event" &&
                        b.datetype === "date"
                        ? 1
                        : getJournalEntryPrincipalDate(b) || new Date(0),
                    ),
                  )}
              />
            </TodoDroppable>
          );
        }),
      )}
    </div>
  );
}
