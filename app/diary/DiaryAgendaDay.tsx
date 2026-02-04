"use client";
import { skipToken, useQuery } from "@apollo/client/react";
import { tz, TZDate } from "@date-fns/tz";
import {
  addDays,
  addHours,
  compareAsc,
  eachDayOfInterval,
  endOfDay,
  isAfter,
  isBefore,
  isPast,
  max,
  min,
  setHours,
  startOfDay,
  subHours,
} from "date-fns";
import { gql } from "graphql-tag";
import type { Session } from "next-auth";
import {
  DiaryAgendaDayUserTodosDocument,
  type Event,
  type NextSet,
  type Todo,
} from "../../graphql.generated";
import { WorkoutSource } from "../../models/workout";
import {
  dateToString,
  dayStartHour,
  DEFAULT_TIMEZONE,
  roundToNearestDay,
  uniqueBy,
} from "../../utils";
import { DiaryAgendaDayDay } from "./DiaryAgendaDayDay";
import { DiaryPoller } from "./DiaryPoller";
import { TodoDroppable } from "./TodoDroppable";
import { getJournalEntryPrincipalDate } from "./diaryUtils";

gql`
  query DiaryAgendaDayUserTodos($interval: IntervalInput!) {
    user {
      id
      exerciseSchedules {
        id
        exerciseId
        enabled
        frequency {
          years
          months
          weeks
          days
          hours
          minutes
          seconds
        }
        increment
        workingSets
        workingReps
        deloadFactor
        baseWeight
        snoozedUntil
        order
        nextSet {
          workedOutAt
          dueOn
          exerciseId
          successful
          nextWorkingSets
          nextWorkingSetInputs {
            unit
            value
            assistType
          }
          scheduleEntry {
            id
            exerciseId
            enabled
            frequency {
              years
              months
              weeks
              days
              hours
              minutes
              seconds
            }
            increment
            workingSets
            workingReps
            deloadFactor
            baseWeight
            snoozedUntil
            order
          }
        }
      }
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
        location {
          id
          createdAt
          updatedAt
          name
          userId
          boulderCircuits {
            id
            holdColor
            gradeEstimate
            gradeRange
            name
            labelColor
            hasZones
            description
            createdAt
            updatedAt
          }
        }
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
`;

export function DiaryAgendaDay({ user }: { user?: Session["user"] }) {
  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);
  const date = dateToString(subHours(now, 5));
  const tzDate = new TZDate(date, timeZone);

  const fetchingInterval = {
    start: addHours(addDays(startOfDay(tzDate), -7), dayStartHour),
    end: addHours(addDays(endOfDay(tzDate), 10), dayStartHour),
  };
  const { data } = useQuery(
    DiaryAgendaDayUserTodosDocument,
    user
      ? {
          variables: { interval: fetchingInterval },
          pollInterval: 300000,
        }
      : skipToken,
  );

  const userData = {
    calendarTodos: data?.user?.todos || [],
    calendarEvents: data?.user?.events || [],
    workouts: data?.user?.workouts || [],
    nextSets: data?.user?.exerciseSchedules
      ? data.user.exerciseSchedules
          .map((schedule) => schedule.nextSet)
          .filter(Boolean)
      : [],
  };

  const {
    calendarEvents = [],
    calendarTodos = [],
    workouts = [],
    nextSets = [],
  } = userData || {};

  const eventsByDate: Record<string, Event[]> = {};
  const todosByDate: Record<string, Todo[]> = {};
  const dueSetsByDate: Record<string, NextSet[]> = {};

  const daysOfInterval = eachDayOfInterval(fetchingInterval).filter(
    (date) => addHours(date, dayStartHour) <= fetchingInterval.end,
  );
  for (const dueSet of nextSets) {
    const calName = dateToString(addHours(dueSet.dueOn, -dayStartHour));
    if (!dueSetsByDate[calName]) dueSetsByDate[calName] = [];
    dueSetsByDate[calName].push(dueSet);
  }

  for (const event of calendarEvents) {
    const eventInterval = {
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
    };

    for (const date of eachDayOfInterval(eventInterval, { in: tz(timeZone) })) {
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
      {daysOfInterval.map((dayDate, dayI) => {
        const dayStart = addHours(startOfDay(dayDate), dayStartHour);
        const dayEnd = addHours(endOfDay(dayDate), dayStartHour);

        const dayEvents = eventsByDate[dateToString(dayDate)] || [];
        const dayName = dateToString(dayDate);
        const dayWorkouts = workouts
          .filter((workout) =>
            workout.source === WorkoutSource.Self
              ? workout.workedOutAt >= startOfDay(dayDate) &&
                workout.workedOutAt <= endOfDay(dayDate)
              : workout.workedOutAt >= dayStart &&
                workout.workedOutAt <= dayEnd,
          )
          .flatMap((workout) =>
            workout.exercises.map((exercise) => ({
              ...workout,
              exercises: [exercise],
            })),
          );

        const dayLocations = uniqueBy(
          dayWorkouts.map((workout) => workout.location).filter(Boolean),
          (location) => location.id,
        );
        const dayDueSets = dueSetsByDate[dayName] || [];
        const dayTodos = todosByDate[dayName] || [];

        return (
          <TodoDroppable key={dayI} date={setHours(dayDate, dayStartHour)}>
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
              ].sort((a, b) => {
                const aAllDay =
                  a.__typename === "Event" && a.datetype === "date";
                const bAllDay =
                  b.__typename === "Event" && b.datetype === "date";
                if (aAllDay && !bAllDay) return -1;
                if (!aAllDay && bAllDay) return 1;

                return compareAsc(
                  getJournalEntryPrincipalDate(
                    a.__typename === "Workout" ? a.exercises[0]! : a,
                  )?.start || new Date(0),
                  getJournalEntryPrincipalDate(
                    b.__typename === "Workout" ? b.exercises[0]! : b,
                  )?.start || new Date(0),
                );
              })}
            />
          </TodoDroppable>
        );
      })}
      {user ? <DiaryPoller userId={user.id} /> : null}
    </div>
  );
}
