import { TZDate } from "@date-fns/tz";
import { startOfDay } from "date-fns";
import { auth } from "../../../../auth";
import { Modal } from "../../../../components/Modal";
import {
  getAllWorkoutExercises,
  getAllWorkoutLocations,
  getNextSets,
} from "../../../../models/workout.server";
import { dateToString, DEFAULT_TIMEZONE } from "../../../../utils";
import { WorkoutForm } from "../../WorkoutForm";

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
  const [locations, exercisesStats, nextSets] = await Promise.all([
    getAllWorkoutLocations(user),
    getAllWorkoutExercises(user),
    getNextSets({ user, to: startOfDay(tzDate) }),
  ]);

  const dismissTo = isToday ? "/diary" : (`/diary/${date}` as const);

  return (
    <Modal dismissTo={dismissTo}>
      <div className="h-screen w-full max-w-3xl overflow-auto overscroll-contain rounded-xl bg-white p-2 shadow-xl shadow-black/50">
        <WorkoutForm
          date={date}
          user={user}
          locations={locations}
          exercisesStats={exercisesStats}
          nextSets={nextSets}
          dismissTo={dismissTo}
        />
      </div>
    </Modal>
  );
}
