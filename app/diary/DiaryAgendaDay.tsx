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
import { ObjectId, type WithId } from "mongodb";
import type { Session } from "next-auth";
import type { MongoVEvent, MongoVTodo } from "../../lib";
import { exercisesById } from "../../models/exercises";
import { Locations } from "../../models/location.server";
import {
  isNextSetDue,
  WorkoutSource,
  type WorkoutData,
  type WorkoutExercise,
} from "../../models/workout";
import {
  getNextSets,
  MaterializedWorkoutsView,
} from "../../models/workout.server";
import {
  getUserIcalEventsBetween,
  getUserIcalTodosBetween,
} from "../../sources/ical";
import {
  dateToString,
  dayStartHour,
  DEFAULT_TIMEZONE,
  rangeToQuery,
  roundToNearestDay,
  unique,
} from "../../utils";
import { DiaryAgendaDayDay } from "./DiaryAgendaDayDay";

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
  const [
    calendarEvents = [],
    calendarTodos = [],
    nextSets = [],
    workouts = [],
  ] = user
    ? await Promise.all([
        getUserIcalEventsBetween(user.id, fetchingInterval),
        getUserIcalTodosBetween(user.id, fetchingInterval),
        getNextSets({ user, to: fetchingInterval.end }),

        MaterializedWorkoutsView.find(
          {
            userId: user.id,
            $or: [
              {
                workedOutAt: rangeToQuery(
                  fetchingInterval.start,
                  fetchingInterval.end,
                ),
              },
              {
                // All-Day workouts are stored with workedOutAt at UTC 00:00 of the day
                workedOutAt: startOfDay(fetchingInterval.start, {
                  in: tz("UTC"),
                }),
              },
            ],
            deletedAt: { $exists: false },
          },
          { sort: { workedOutAt: -1 } },
        ).toArray(),
      ])
    : [];

  const eventsByDate: Record<string, MongoVEvent[]> = {};
  const todosByDate: Record<string, MongoVTodo[]> = {};
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
                        in: tz(event.start.tz || DEFAULT_TIMEZONE),
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
                        in: tz(event.end.tz || DEFAULT_TIMEZONE),
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
      if (
        (isPast(dayEnd) && !todo.completed) ||
        Object.values(todosByDate)
          .flat()
          .some((e) => e.uid === todo.uid)
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
          const dayLocations = await Locations.find({
            _id: {
              $in: unique(dayWorkouts.map((workout) => workout.locationId)).map(
                (id) => new ObjectId(id),
              ),
            },
          }).toArray();
          const dayExercisesById = dayWorkouts
            .flatMap((workout) =>
              workout.exercises.map((exercise) => [exercise, workout] as const),
            )
            .sort(([, a], [, b]) => compareAsc(a.workedOutAt, b.workedOutAt))
            // Group by exerciseId to merge multiple workouts of the same exercise on the same day
            .reduce<Record<string, [WorkoutExercise, WithId<WorkoutData>][]>>(
              (acc, [exercise, workout]) => {
                const key = exercise.exerciseId;
                if (!acc[key]) acc[key] = [];
                acc[key].push([exercise, workout]);
                return acc;
              },
              {},
            );

          const dayExerciseSets = Object.entries(dayExercisesById)
            .map(
              ([exerciseId, exerciseWorkouts]) =>
                [
                  exercisesById[parseInt(exerciseId)]!,
                  exerciseWorkouts.flatMap(([{ sets }, workout]) =>
                    sets.map(
                      (set) =>
                        [
                          set,
                          dayLocations.find(
                            (loc) => loc._id.toString() === workout.locationId,
                          ),
                          workout,
                        ] as const,
                    ),
                  ),
                  exerciseWorkouts.map(([_, workout]) => workout),
                ] as const,
            )
            .sort(([, a], [, b]) => b.length - a.length);

          const dayDueSets = dueSetsByDate[dayName] || [];
          const dayTodos = todosByDate[dayName] || [];

          return (
            <DiaryAgendaDayDay
              key={dayI}
              date={dayName}
              dayDate={dayDate}
              user={user}
              dayLocations={dayLocations}
              dayEvents={dayEvents}
              dayWorkouts={dayWorkouts}
              dayDueSets={dayDueSets}
              dayTodos={dayTodos}
              dayExerciseSets={dayExerciseSets}
            />
          );
        }),
      )}
    </div>
  );
}
