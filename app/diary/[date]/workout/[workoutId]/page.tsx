import { TZDate } from "@date-fns/tz";
import { auth } from "../../../../../auth";
import { Modal } from "../../../../../components/Modal";
import { dateToString, DEFAULT_TIMEZONE } from "../../../../../utils";
import DiaryWorkout from "./DiaryWorkout";

export default async function DiaryWorkoutModal(props: {
  params: Promise<{
    date: `${number}-${number}-${number}`;
    workoutId: string;
  }>;
}) {
  const { date, workoutId } = await props.params;
  const user = (await auth())?.user;

  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const isToday = date === dateToString(TZDate.tz(timeZone));
  const dismissTo = isToday ? "/diary" : (`/diary/${date}` as const);

  return (
    <Modal dismissTo={dismissTo}>
      <div className="h-screen max-w-3xl overflow-auto overscroll-contain rounded-xl bg-white p-2 shadow-xl shadow-black/50">
        <DiaryWorkout date={date} workoutId={workoutId} />
        <div className="opacity-0 select-none">
          afgaisdfuh afgaisdfuh afgaisdfuh afgaisdfuh afgaisdfuh afgaisdfuh
          afgaisdfuh afgaisdfuh afgaisdfuh afgaisdfuh afgaisdfuh afgaisdfuh
          afgaisdfuh afgaisdfuh afgaisdfuh afgaisdfuh afgaisdfuh afgaisdfuh
          afgaisdfuh afgaisdfuh
        </div>
      </div>
    </Modal>
  );
}
