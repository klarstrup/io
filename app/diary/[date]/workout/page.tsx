import { TZDate } from "@date-fns/tz";
import { endOfDay } from "date-fns";
import type { Session } from "next-auth";
import { auth } from "../../../../auth";
import { Modal } from "../../../../components/Modal";
import { getNextSets, Workouts } from "../../../../models/workout.server";
import { dateToString, DEFAULT_TIMEZONE } from "../../../../utils";
import { WorkoutForm } from "../../WorkoutForm";

const getAllWorkoutLocations = async (user: Session["user"]) =>
  (
    await Workouts.distinct("location", {
      userId: user.id,
      deletedAt: { $exists: false },
    })
  ).filter((loc): loc is string => Boolean(loc));

export default async function DiaryNewWorkoutModal(props: {
  params: Promise<{
    date: `${number}-${number}-${number}`;
  }>;
}) {
  const { date } = await props.params;
  const user = (await auth())?.user;

  if (!user) return null;

  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const isToday = date === dateToString(TZDate.tz(timeZone));

  const tzDate = new TZDate(date, timeZone);
  const [locations, nextSets] = await Promise.all([
    getAllWorkoutLocations(user),
    getNextSets({ user, to: endOfDay(tzDate) }),
  ]);

  const dismissTo = isToday ? "/diary" : (`/diary/${date}` as const);

  return (
    <Modal dismissTo={dismissTo}>
      <div className="h-full overflow-auto overscroll-contain rounded-xl bg-white p-4 shadow-xl shadow-black/50">
        <WorkoutForm
          date={date}
          user={user}
          locations={locations}
          nextSets={nextSets}
          dismissTo={dismissTo}
        />
      </div>
    </Modal>
  );
}
