import { TZDate } from "@date-fns/tz";
import { endOfDay, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import { getNextSets, Workouts } from "../../../models/workout.server";
import { DEFAULT_TIMEZONE } from "../../../utils";
import { DiaryAgendaWorkouts } from "./DiaryAgendaWorkouts";
import { getDiaryEntries } from "./getDiaryEntries";

const getAllWorkoutLocations = async (user: Session["user"]) =>
  (
    await Workouts.distinct("location", {
      userId: user.id,
      deletedAt: { $exists: false },
    })
  ).filter((loc): loc is string => Boolean(loc));

export async function DiaryAgendaWorkoutsWrapper({
  date,
  user,
}: {
  date: `${number}-${number}-${number}`;
  user: Session["user"];
}) {
  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const [locations, nextSets, diaryEntries] = await Promise.all([
    getAllWorkoutLocations(user),
    getNextSets({ user, to: startOfDay(new TZDate(date, timeZone)) }),
    getDiaryEntries({
      from: startOfDay(new Date(date)),
      to: endOfDay(new Date(date)),
    }),
  ]);

  return (
    <DiaryAgendaWorkouts
      date={date}
      workouts={diaryEntries[0]?.[1]?.workouts}
      user={user}
      locations={locations}
      nextSets={nextSets}
    />
  );
}
