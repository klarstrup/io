import { tz } from "@date-fns/tz";
import {
  getDay,
  type Interval,
  isWithinInterval,
  setHours,
  startOfDay,
} from "date-fns";
import { ObjectId } from "mongodb";
import type { Account } from "next-auth";
import { auth } from "../auth";
import type {
  GQEvent,
  GQExerciseInfo,
  GQJournalEntryUnion,
  GQMeal,
  GQNextSet,
  GQSleep,
  GQTodo,
  GQWorkout,
  GQWorkoutExercise,
  GQWorkoutSet,
  GQWorkoutSetInput,
  GQWorkoutSetMeta,
} from "../graphql.generated/graphql";
import {
  getUserIcalEventsBetween,
  getUserIcalTodosBetween,
} from "../sources/ical.server";
import type { Meyers } from "../sources/meyers";
import { MeyersMenus } from "../sources/meyers.server";
import { PostNordShipmentInformation } from "../sources/postnord.server";
import { DataSource } from "../sources/utils";
import { getUserWithingsSleepSummarySeriesBetween } from "../sources/withings.server";
import {
  allPromises,
  endOfDayButItRespectsDayStartHour,
  rangeToQuery,
  unique,
} from "../utils";
import { proxyCollection } from "../utils.server";
import type { ITodoScheduleWithExerciseProgram, IUser } from "./user";
import { getNextSets, MaterializedWorkoutsView } from "./workout.server";

export const Users = proxyCollection<IUser>("users");

export const Accounts = proxyCollection<Account>("accounts");

export const getUserJournalEntries = async (
  userId: string,
  fromDay: Date,
  toDay: Date,
) => {
  const interval = {
    // Overfetch to midnight to include legacy workouts and all-day events that are stored with start
    start: startOfDay(fromDay),
    end: endOfDayButItRespectsDayStartHour(toDay),
  } satisfies Interval;

  const entries: GQJournalEntryUnion[] = [];

  await allPromises(
    Array.fromAsync(getUserIcalTodosBetween(userId, interval), (todo) =>
      entries.push({
        ...todo,
        id: todo.uid,
        __typename: "Todo",
      } satisfies GQTodo),
    ),
    Array.fromAsync(getUserIcalEventsBetween(userId, interval), (event) =>
      entries.push({
        ...event,
        id: event.uid,
        __typename: "Event",
        url: typeof event.url === "string" ? event.url : null,
      } satisfies GQEvent),
    ),
    Array.fromAsync(
      (await Users.findOne({ _id: new ObjectId(userId) }))?.dataSources?.some(
        (dataSource) =>
          dataSource.source === DataSource.Meyers && dataSource.paused !== true,
      )
        ? MeyersMenus.find({
            date_time: rangeToQuery(interval.start, interval.end),
            "names.da": "Almanak",
          })
        : [],
      (menu) => {
        if (getDay(menu.date_time) === 3) return; // wfh wednesday, skip

        const formatMeyersMenuSummary = (menu: Meyers.MongoMenu) => {
          const dishes = unique(
            menu.menu_sections
              .filter(
                (section) =>
                  !section.names.da?.includes("halal") &&
                  !section.names.da?.includes("vegansk") &&
                  !section.names.da?.includes("vegetar") &&
                  (section.names.da?.includes("Varm ret") ||
                    section.names.da?.includes("Delikatesse") ||
                    section.names.da?.includes("Torsdagssødt")),
              )
              .flatMap((section) =>
                section.menu_dishes
                  .map((dish) => {
                    const sectionName = section.names.en || "";
                    const dishName = dish.names.en || "";
                    let prefix = "";

                    const lDish = dishName.toLowerCase();
                    const lSection = sectionName.toLowerCase();
                    if (lSection.includes("hot dish")) {
                      if (lDish.includes("burrito")) {
                        prefix = "🌯";
                      } else if (lDish.includes("burger")) {
                        prefix = "🍔";
                      } else if (lDish.includes("pasta")) {
                        prefix = "🍝";
                      } else if (lDish.includes("pizza")) {
                        prefix = "🍕";
                      } else if (lDish.includes("soup")) {
                        prefix = "🍲";
                      } else if (lDish.includes("taco")) {
                        prefix = "🌮";
                      } else if (lDish.includes("pita")) {
                        prefix = "🥙";
                      } else if (
                        lDish.includes("curry") ||
                        lDish.includes("korma") ||
                        lDish.includes("masala")
                      ) {
                        prefix = "🍛";
                      } else {
                        prefix = "🥘";
                      }
                    } else if (lSection.includes("delicacy")) {
                      if (lDish.includes("salad")) {
                        prefix = "🥗";
                      } else {
                        prefix = "🥪";
                      }
                    } else if (lSection.includes("thursday sweet")) {
                      prefix = "🍰";
                    }

                    return `${prefix} ${dishName || ""}`;
                  })
                  .filter(Boolean)
                  .map((name) =>
                    / - /.test(name)
                      ? name.split(/ - /)[0]
                      : / with /.test(name)
                        ? name.split(/ with /)[0]
                        : / of /.test(name)
                          ? name.split(/ of /)[0]
                          : /, /.test(name)
                            ? name.split(/, /)[0]
                            : name,
                  ),
              )
              .filter(Boolean),
          );

          return dishes.map((dish): GQMeal["foodEntries"][number] => ({
            id: dish,
            type: "FOOD_ENTRY",
            datetime: setHours(menu.date_time, 10),
            nutritionalContents: null,
            mealName: "Lunch",
            food: {
              id: dish,
              description: dish,
              __typename: "Food",
            },
            servings: null,
            servingSize: null,
            __typename: "FoodEntry",
          }));
        };

        entries.push({
          __typename: "Meal",
          id: menu._id.toString(),
          datetime: setHours(menu.date_time, 10),
          type: "LUNCH",
          mealName: "Lunch",
          foodEntries: formatMeyersMenuSummary(menu),
          url: "https://meyers.dk/frokost/almanak",
        } satisfies GQMeal);
      },
    ),
    Array.fromAsync(
      getUserWithingsSleepSummarySeriesBetween(userId, interval),
      (sleep) =>
        entries.push({
          ...sleep,
          deviceId: sleep.hash_deviceid,
          id: String(sleep.id),
          totalSleepTime: sleep.data.total_sleep_time,
          __typename: "Sleep",
        } satisfies GQSleep),
    ),
    Array.fromAsync(
      MaterializedWorkoutsView.find({
        userId,
        $or: [
          { workedOutAt: rangeToQuery(interval.start, interval.end) },
          // All-Day workouts are stored with workedOutAt at UTC 00:00 of the day
          { workedOutAt: startOfDay(interval.start, { in: tz("UTC") }) },
        ],
        deletedAt: { $exists: false },
      }),
      (workout) =>
        entries.push({
          ...workout,
          location: undefined,
          exercises: workout.exercises.map(
            (exercise) =>
              ({
                ...exercise,
                __typename: "WorkoutExercise",
                // This will be resolved in the WorkoutExercise.exerciseInfo resolver, I don't know how to make the type system understand that
                exerciseInfo: undefined as unknown as GQExerciseInfo,
                sets: exercise.sets.map(
                  (set) =>
                    ({
                      ...set,
                      __typename: "WorkoutSet",
                      inputs: set.inputs.map(
                        (input) =>
                          ({
                            ...input,
                            __typename: "WorkoutSetInput",
                          }) satisfies GQWorkoutSetInput,
                      ),
                      meta:
                        set.meta &&
                        Object.entries(set.meta || {}).map(
                          ([key, value]) =>
                            ({
                              key,
                              value: String(value),
                              __typename: "WorkoutSetMeta",
                            }) satisfies GQWorkoutSetMeta,
                        ),
                    }) satisfies GQWorkoutSet,
                ),
              }) satisfies GQWorkoutExercise,
          ),
          // The _id field of the MaterializedWorkoutsView is different from the Workouts document _ID
          id: workout.id || workout._id.toString(),
          __typename: "Workout",
        } satisfies GQWorkout),
    ),
    Array.fromAsync(
      getNextSets(
        userId,
        ((await auth())?.user.todoSchedules || []).filter(
          (schedule): schedule is ITodoScheduleWithExerciseProgram =>
            Boolean(schedule.exerciseProgram),
        ),
      ),
      (nextSet) => {
        // Todo: Bake this into getNextSets instead of filtering here
        if (!isWithinInterval(nextSet.dueOn, interval)) return;

        entries.push({
          ...nextSet,
          __typename: "NextSet",
          nextWorkingSetInputs: nextSet.nextWorkingSetInputs?.map((input) => ({
            ...input,
            __typename: "WorkoutSetInput",
          })),
          exerciseSchedule: {
            ...nextSet.exerciseSchedule,
            ...nextSet.exerciseSchedule.exerciseProgram,
            __typename: "ExerciseSchedule",
            frequency: {
              ...nextSet.exerciseSchedule.frequency,
              __typename: "Duration",
            },
            // This will be resolved in the WorkoutExercise.exerciseInfo resolver, I don't know how to make the type system understand that
            exerciseInfo: undefined as unknown as GQExerciseInfo,
          },
        } satisfies GQNextSet);
      },
    ),
    Array.fromAsync(
      PostNordShipmentInformation.find({ _io_userId: userId }),
      (postNordShipmentInformation) => {
        const firstItem = postNordShipmentInformation.items[0];
        if (!firstItem) return;
        const lastEvent = firstItem.events[firstItem.events.length - 1];
        if (!lastEvent) return;

        entries.push({
          id: postNordShipmentInformation.shipmentId,
          url: `https://tracking.postnord.com/dk/tracking?id=${postNordShipmentInformation.shipmentId}`,
          timestamp: lastEvent.eventTime,
          status: lastEvent.status,
          from: postNordShipmentInformation.sender.name,
          __typename: "Delivery",
        } satisfies GQJournalEntryUnion);
      },
    ),
  );

  return entries;
};
