import { TZDate } from "@date-fns/tz";
import {
  addSeconds,
  endOfDay,
  endOfHour,
  isAfter,
  isWithinInterval,
  startOfDay,
  subHours,
  subSeconds,
  subWeeks,
} from "date-fns";
import { ObjectId } from "mongodb";
import type { Session } from "next-auth";
import Image, { StaticImageData } from "next/image";
import { auth } from "../../auth";
import * as weatherIconsByCode from "../../components/weather-icons/index";
import { getDB } from "../../dbConnect";
import { dbFetch } from "../../fetch";
import type { DiaryEntry } from "../../lib";
import { IUser } from "../../models/user";
import { WorkoutData } from "../../models/workout";
import { getNextSets } from "../../models/workout.server";
import {
  type Fitocracy,
  workoutFromFitocracyWorkout,
} from "../../sources/fitocracy";
import { MyFitnessPal } from "../../sources/myfitnesspal";
import { getMyFitnessPalSession } from "../../sources/myfitnesspal.server";
import { type RunDouble, workoutFromRunDouble } from "../../sources/rundouble";
import {
  type TopLogger,
  workoutFromTopLoggerAscends,
} from "../../sources/toplogger";
import { allPromises, DAY_IN_SECONDS, HOUR_IN_SECONDS } from "../../utils";
import LoadMore from "../[[...slug]]/LoadMore";
import UserStuff from "../[[...slug]]/UserStuff";
import "../page.css";
import { DiaryEntryItem } from "./DiaryEntryItem";
import { DiaryEntryList } from "./DiaryEntryList";

export const maxDuration = 60;
export const revalidate = 3600; // 1 hour

interface TomorrowResponse {
  data: {
    timelines: {
      timestep: string;
      endTime: string;
      startTime: string;
      intervals: {
        startTime: string;
        values: {
          cloudCover: number;
          humidity: number;
          precipitationIntensity: number;
          precipitationProbability: number;
          precipitationType: number;
          temperatureApparent: number;
          weatherCode: number;
          windGust: number;
          windSpeed: number;
          sunriseTime: string;
          sunsetTime: string;
        };
      }[];
    }[];
  };
}

const weeksPerPage = 4;

type DayStr = `${number}-${number}-${number}`;

const rangeToQuery = (from: Date, to?: Date) =>
  to ? { $gte: from, $lt: to } : { $gte: from };

const getAllWorkoutLocations = async (user: Session["user"]) => {
  const DB = await getDB();
  const workoutsCollection = DB.collection<WorkoutData>("workouts");

  return (
    await workoutsCollection.distinct("location", {
      userId: user.id,
      deletedAt: { $exists: false },
    })
  ).filter((loc): loc is string => Boolean(loc));
};

async function getDiaryEntries({ from, to }: { from: Date; to?: Date }) {
  const user = (await auth())?.user;
  if (!user) throw new Error("User not found");

  const DB = await getDB();

  const workoutsCollection =
    DB.collection<Fitocracy.MongoWorkout>("fitocracy_workouts");

  const runsCollection =
    DB.collection<RunDouble.MongoHistoryItem>("rundouble_runs");

  const foodEntriesCollection = DB.collection<MyFitnessPal.MongoFoodEntry>(
    "myfitnesspal_food_entries"
  );

  const now = TZDate.tz("Europe/Copenhagen");
  const todayStr = `${now.getFullYear()}-${
    now.getMonth() + 1
  }-${now.getDate()}`;
  const diary: Record<DayStr, DiaryEntry> = !to ? { [todayStr]: {} } : {};
  function addDiaryEntry<K extends keyof (typeof diary)[keyof typeof diary]>(
    date: Date,
    key: K,
    entry: NonNullable<DiaryEntry[K]>[number]
  ) {
    const dayStr: DayStr = `${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}`;
    let day = diary[dayStr];
    if (!day) {
      day = {};
    }
    let dayEntries = day[key];
    if (!dayEntries) {
      dayEntries = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    dayEntries.push(entry as any);
    day[key] = dayEntries;

    diary[dayStr] = day;
  }

  await allPromises(
    async () => {
      for await (const workout of DB.collection<WorkoutData>("workouts").find({
        userId: user.id,
        deletedAt: { $exists: false },
        workedOutAt: rangeToQuery(from, to),
      })) {
        addDiaryEntry(workout.workedOutAt, "workouts", {
          ...workout,
          _id: workout._id.toString(),
        });
      }
    },
    async () => {
      if (!user.fitocracyUserId) return;

      for await (const fitocracyWorkout of workoutsCollection.find({
        user_id: user.fitocracyUserId,
        workout_timestamp: rangeToQuery(from, to),
      })) {
        const workout = workoutFromFitocracyWorkout(fitocracyWorkout);
        addDiaryEntry(workout.workedOutAt, "workouts", {
          ...workout,
          _id: workout._id.toString(),
        });
      }
    },
    async () => {
      if (!user.myFitnessPalUserId) return;

      for await (const foodEntry of foodEntriesCollection.find({
        user_id: user.myFitnessPalUserId,
        datetime: rangeToQuery(from, to),
      })) {
        addDiaryEntry(foodEntry.datetime, "food", {
          ...foodEntry,
          _id: foodEntry._id.toString(),
        });
      }
    },
    async () => {
      if (!user.topLoggerId) return;

      const [holds, gyms, ascends] = await Promise.all([
        DB.collection<TopLogger.Hold>("toplogger_holds").find().toArray(),
        DB.collection<TopLogger.GymSingle>("toplogger_gyms").find().toArray(),
        DB.collection<TopLogger.AscendSingle>("toplogger_ascends")
          .find({
            user_id: user.topLoggerId,
            date_logged: rangeToQuery(from, to),
          })
          .toArray(),
      ]);

      const climbs = await DB.collection<TopLogger.ClimbMultiple>(
        "toplogger_climbs"
      )
        .find({ id: { $in: ascends.map(({ climb_id }) => climb_id) } })
        .toArray();

      const ascendsByDay = Object.values(
        ascends.reduce((acc, ascend) => {
          if (!ascend.date_logged) return acc;
          const date = `${ascend.date_logged.getFullYear()}-${
            ascend.date_logged.getMonth() + 1
          }-${ascend.date_logged.getDate()}`;
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(ascend);

          return acc;
        }, {} as Record<string, TopLogger.AscendSingle[]>)
      );
      for (const dayAscends of ascendsByDay) {
        addDiaryEntry(
          dayAscends[0]!.date_logged,
          "workouts",
          workoutFromTopLoggerAscends(
            dayAscends.map((ascend) => ({
              ...ascend,
              climb: climbs.find(({ id }) => id === ascend.climb_id)!,
            })),
            holds,
            gyms
          )
        );
      }
    },
    async () => {
      if (!user.runDoubleId) return;

      for await (const run of runsCollection.find({
        userId: user.runDoubleId,
        completedAt: rangeToQuery(from, to),
      })) {
        addDiaryEntry(run.completedAt, "workouts", workoutFromRunDouble(run));
      }
    }
  );

  const diaryEntries = Object.entries(diary).sort(
    ([a], [b]) =>
      new Date(
        Number(b.split("-")[0]),
        Number(b.split("-")[1]) - 1,
        Number(b.split("-")[2])
      ).getTime() -
      new Date(
        Number(a.split("-")[0]),
        Number(a.split("-")[1]) - 1,
        Number(a.split("-")[2])
      ).getTime()
  ) as [DayStr, DiaryEntry][];

  return diaryEntries;
}

async function loadMoreData(cursor: string) {
  "use server";

  const user = (await auth())?.user;
  if (!user) throw new Error("User not found");

  const { from, to } = JSON.parse(cursor) as {
    from?: string;
    to?: string;
  };
  if (!from) throw new Error("From not found");
  if (!to) throw new Error("To not found");

  const isAtLimit = isAfter(new Date(2013, 9), to || from);

  if (isAtLimit) return [null, null] as const;

  const [diaryEntries, allLocations, nextSets] = await Promise.all([
    getDiaryEntries({ from: new Date(from), to: new Date(to) }),
    getAllWorkoutLocations(user),
    getNextSets({ user, to: startOfDay(new Date()) }),
  ]);

  return [
    <DiaryEntryList
      diaryEntries={diaryEntries}
      user={user}
      locations={allLocations}
      nextSets={nextSets}
      key={JSON.stringify({ from, to })}
    />,
    JSON.stringify({ from: subWeeks(from, weeksPerPage), to: from }),
  ] as const;
}

export default async function Page() {
  const user = (await auth())?.user;

  if (!user)
    return (
      <div>
        <span>Hello, stranger!</span>
        <p>
          <a href="/api/auth/signin">Sign in</a>
        </p>
      </div>
    );

  const DB = await getDB();

  if (!user.myFitnessPalUserId || !user.myFitnessPalUserName) {
    const myFitnessPalToken = user?.myFitnessPalToken;
    if (myFitnessPalToken) {
      try {
        const session = await getMyFitnessPalSession(myFitnessPalToken);
        await DB.collection<IUser>("users").updateOne(
          { _id: new ObjectId(user.id) },
          {
            $set: {
              myFitnessPalUserId: session.userId,
              myFitnessPalUserName: session.user.name,
            },
          }
        );
      } catch {
        /* empty */
      }
    }
  }
  let weatherIntervals:
    | TomorrowResponse["data"]["timelines"][0]["intervals"]
    | undefined;
  let weatherDayInterval:
    | TomorrowResponse["data"]["timelines"][0]["intervals"][0]
    | undefined;
  if (process.env.TOMORROW_API_KEY) {
    const tomorrowUrl = new URL("https://api.tomorrow.io/v4/timelines");
    tomorrowUrl.searchParams.set("location", `55.658693,12.489322`);
    tomorrowUrl.searchParams.set(
      "startTime",
      subSeconds(startOfDay(TZDate.tz("Europe/Copenhagen")), 1).toISOString()
    );
    tomorrowUrl.searchParams.set(
      "endTime",
      endOfDay(TZDate.tz("Europe/Copenhagen")).toISOString()
    );
    tomorrowUrl.searchParams.set("timezone", "Europe/Copenhagen");
    tomorrowUrl.searchParams.set(
      "fields",
      "temperatureApparent,humidity,windSpeed,windDirection,windGust,precipitationIntensity,precipitationProbability,precipitationType,cloudCover,weatherCode"
    );
    tomorrowUrl.searchParams.set("timesteps", "1h");
    tomorrowUrl.searchParams.set("units", "metric");
    tomorrowUrl.searchParams.set("apikey", process.env.TOMORROW_API_KEY);
    weatherIntervals = (
      await dbFetch<TomorrowResponse>(tomorrowUrl, undefined, {
        maxAge: HOUR_IN_SECONDS,
      })
    ).data?.timelines[0]?.intervals.filter((interval) =>
      isAfter(new Date(interval.startTime), endOfHour(subHours(new Date(), 1)))
    );

    const tomorrowDayUrl = new URL("https://api.tomorrow.io/v4/timelines");
    tomorrowDayUrl.searchParams.set("location", `55.658693,12.489322`);
    tomorrowDayUrl.searchParams.set(
      "startTime",
      startOfDay(TZDate.tz("Europe/Copenhagen")).toISOString()
    );
    tomorrowDayUrl.searchParams.set(
      "endTime",
      addSeconds(endOfDay(TZDate.tz("Europe/Copenhagen")), 1).toISOString()
    );
    tomorrowDayUrl.searchParams.set("timezone", "Europe/Copenhagen");
    tomorrowDayUrl.searchParams.set("fields", "sunriseTime,sunsetTime");
    tomorrowDayUrl.searchParams.set("timesteps", "1d");
    tomorrowDayUrl.searchParams.set("units", "metric");
    tomorrowDayUrl.searchParams.set("apikey", process.env.TOMORROW_API_KEY);
    weatherDayInterval = (
      await dbFetch<TomorrowResponse>(tomorrowDayUrl, undefined, {
        maxAge: DAY_IN_SECONDS,
      })
    ).data?.timelines[0]?.intervals.find((interval) =>
      isWithinInterval(new Date(interval.startTime), {
        start: startOfDay(TZDate.tz("Europe/Copenhagen")),
        end: endOfDay(TZDate.tz("Europe/Copenhagen")),
      })
    );
  }

  const from = subWeeks(TZDate.tz("Europe/Copenhagen"), weeksPerPage);
  const to = startOfDay(TZDate.tz("Europe/Copenhagen"));
  const [diaryEntries, allLocations, nextSets] = await Promise.all([
    getDiaryEntries({ from, to }),
    getAllWorkoutLocations(user),
    getNextSets({ user, to: startOfDay(new Date()) }),
  ]);

  const initialCursor = JSON.stringify({
    from: subWeeks(from, weeksPerPage),
    to: from,
  });

  return (
    <div>
      <UserStuff />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, 1fr)",
          gridTemplateRows: "masonry",
          gap: "1em",
          padding: "1em",
          maxWidth: "64em",
          margin: "0 auto",
        }}
      >
        <DiaryEntryItem
          diaryEntry={
            (
              await getDiaryEntries({
                from: startOfDay(TZDate.tz("Europe/Copenhagen")),
              })
            )[0]!
          }
          user={user}
          locations={allLocations}
          nextSets={nextSets}
        >
          {weatherIntervals?.[0] && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "0.5em",
              }}
            >
              <h3>Weather</h3>
              {weatherDayInterval && (
                <div>
                  Daylight:{" "}
                  {new Date(
                    weatherDayInterval.values.sunriseTime
                  ).toLocaleTimeString("en-DK", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Europe/Copenhagen",
                  })}
                  -
                  {new Date(
                    weatherDayInterval.values.sunsetTime
                  ).toLocaleTimeString("en-DK", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Europe/Copenhagen",
                  })}
                </div>
              )}
              <ol
                start={Number(
                  new Date(weatherIntervals[0].startTime).toLocaleTimeString(
                    "en-DK",
                    { hour: "numeric", timeZone: "Europe/Copenhagen" }
                  )
                )}
                style={{
                  paddingInlineStart: "28px",
                  marginBlockStart: 0,
                  marginBlockEnd: 0,
                }}
              >
                {weatherIntervals.map((interval, i) => {
                  const extendedWeatherCode = Number(
                    String(interval.values.weatherCode) +
                      String(
                        weatherDayInterval?.values.sunriseTime &&
                          weatherDayInterval?.values.sunsetTime &&
                          isWithinInterval(new Date(interval.startTime), {
                            start: new Date(
                              weatherDayInterval.values.sunriseTime
                            ),
                            end: new Date(weatherDayInterval.values.sunsetTime),
                          })
                          ? 0
                          : 1
                      )
                  );
                  const weatherIcon =
                    (extendedWeatherCode in weatherIconsByCode &&
                      (weatherIconsByCode[extendedWeatherCode] as
                        | StaticImageData
                        | undefined)) ||
                    (extendedWeatherCode.toString().substring(0, 4) + "0" in
                      weatherIconsByCode &&
                      (weatherIconsByCode[
                        extendedWeatherCode.toString().substring(0, 4) + "0"
                      ] as StaticImageData | undefined)) ||
                    null;
                  return (
                    <li key={i}>
                      {weatherIcon ? (
                        <Image
                          src={weatherIcon}
                          alt={prettyPrintWeatherCode(extendedWeatherCode)}
                          title={prettyPrintWeatherCode(extendedWeatherCode)}
                          width={24}
                          style={{ verticalAlign: "middle" }}
                        />
                      ) : (
                        extendedWeatherCode
                      )}{" "}
                      <span
                        style={{ fontSize: "1.4em", verticalAlign: "middle" }}
                      >
                        {interval.values.temperatureApparent.toFixed(1)}
                      </span>
                      <sup style={{ fontSize: "0.7em" }}>°C</sup>
                      <sub
                        style={{
                          fontSize: "0.7em",
                          marginLeft: "-14px",
                        }}
                      >
                        {interval.values.humidity.toFixed(0)}%
                      </sub>{" "}
                      {interval.values.windSpeed.toFixed(1)}
                      <sup style={{ fontSize: "0.7em" }}>m/s</sup>{" "}
                      {interval.values.precipitationProbability > 0 &&
                      interval.values.precipitationIntensity > 0.11 ? (
                        <>
                          <span
                            style={{
                              fontSize: "1.4em",
                              verticalAlign: "middle",
                            }}
                          >
                            {interval.values.precipitationIntensity.toFixed(2)}
                          </span>
                          <sup style={{ fontSize: "0.7em" }}>mm</sup>
                          <sub
                            style={{
                              fontSize: "0.7em",
                              marginLeft: "-14px",
                            }}
                          >
                            {interval.values.precipitationProbability.toFixed(
                              0
                            )}
                            %
                          </sub>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </DiaryEntryItem>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(20em, 1fr))",
          gridTemplateRows: "masonry",
          gap: "1em",
          padding: "1em",
        }}
      >
        <LoadMore loadMoreAction={loadMoreData} initialCursor={initialCursor}>
          <DiaryEntryList
            diaryEntries={diaryEntries}
            user={user}
            locations={allLocations}
            nextSets={nextSets}
          />
        </LoadMore>
      </div>
    </div>
  );
}

const weatherCodes = {
  0: "Unknown",
  1000: "Clear",
  1001: "Cloudy",
  1100: "Mostly Clear",
  1101: "Partly Cloudy",
  1102: "Mostly Cloudy",
  2000: "Fog",
  2100: "Light Fog",
  3000: "Light Wind",
  3001: "Wind",
  3002: "Strong Wind",
  4000: "Drizzle",
  4001: "Rain",
  4200: "Light Rain",
  4201: "Heavy Rain",
  5000: "Snow",
  5001: "Flurries",
  5100: "Light Snow",
  5101: "Heavy Snow",
  6000: "Freezing Drizzle",
  6001: "Freezing Rain",
  6200: "Light Freezing Rain",
  6201: "Heavy Freezing Rain",
  7000: "Ice Pellets",
  7101: "Heavy Ice Pellets",
  7102: "Light Ice Pellets",
  8000: "Thunderstorm",
} as const;
const prettyPrintWeatherCode = (code: number): string => {
  const truncatedCode = code.toString().slice(0, 4);

  if (truncatedCode in weatherCodes) {
    return weatherCodes[truncatedCode as unknown as keyof typeof weatherCodes];
  }

  return "Unknown";
};
