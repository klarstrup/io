import { TZDate } from "@date-fns/tz";
import { gql } from "graphql-tag";
import { query } from "../../ApolloClient";
import { auth } from "../../auth";
import { CalendarUserWorkoutsQuery } from "../../graphql.generated";
import type { DiaryEntry } from "../../lib";
import { allPromises, dateToString, DEFAULT_TIMEZONE } from "../../utils";

type DayStr = `${number}-${number}-${number}`;

export async function getDiaryEntriesShallow({
  from,
  to,
}: {
  from: Date;
  to?: Date;
}) {
  const user = (await auth())?.user;
  if (!user) throw new Error("User not found");
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const now = TZDate.tz(timeZone);
  const todayStr = dateToString(now);
  const diary: Record<DayStr, DiaryEntry> = !to ? { [todayStr]: {} } : {};
  function addDiaryEntry<K extends keyof (typeof diary)[keyof typeof diary]>(
    date: Date,
    key: K,
    entry: NonNullable<DiaryEntry[K]>[number],
  ) {
    const dayStr: DayStr = dateToString(new TZDate(date, timeZone));
    let day = diary[dayStr];
    if (!day) day = {};

    let dayEntries = day[key];
    if (!dayEntries) dayEntries = [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    dayEntries.push(entry as any);
    day[key] = dayEntries;

    diary[dayStr] = day;
  }

  const queryResult = await query<CalendarUserWorkoutsQuery>({
    query: gql`
      query CalendarUserWorkouts($interval: IntervalInput!) {
        user {
          id
          workouts(interval: $interval) {
            id
            createdAt
            updatedAt
            workedOutAt
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
            exercises {
              exerciseId
              exerciseInfo {
                id
                aliases
                name
                isHidden
                inputs {
                  id
                  type
                }
                instructions {
                  value
                }
                tags {
                  name
                  type
                }
              }
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
          foodEntries(interval: $interval) {
            id
            datetime
            type
            food {
              id
              description
              servingSizes {
                value
                unit
                nutritionMultiplier
              }
            }
            mealName
            servings
            servingSize {
              value
              unit
              nutritionMultiplier
            }
            nutritionalContents {
              energy {
                value
                unit
              }
              protein
            }
          }
        }
      }
    `,
    variables: { interval: { start: from, end: to } },
  });

  await allPromises(
    async () => {
      for (const foodEntry of queryResult.data?.user?.foodEntries || []) {
        addDiaryEntry(foodEntry.datetime, "food", foodEntry);
      }
    },
    async () => {
      for (const workout of queryResult.data?.user?.workouts || []) {
        addDiaryEntry(workout.workedOutAt, "workouts", workout);
      }
    },
  );

  const diaryEntries = Object.entries(diary).sort(
    ([a], [b]) =>
      new Date(
        Number(b.split("-")[0]),
        Number(b.split("-")[1]) - 1,
        Number(b.split("-")[2]),
      ).getTime() -
      new Date(
        Number(a.split("-")[0]),
        Number(a.split("-")[1]) - 1,
        Number(a.split("-")[2]),
      ).getTime(),
  ) as [DayStr, DiaryEntry][];

  return diaryEntries;
}
