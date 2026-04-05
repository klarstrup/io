import { TZDate } from "@date-fns/tz";
import { auth } from "../../../../auth";
import { Modal } from "../../../../components/Modal";
import { dateToString, DEFAULT_TIMEZONE } from "../../../../utils";
import DiaryNewWorkout from "./DiaryNewWorkout";

export default async function DiaryNewWorkoutModal(props: {
  params: Promise<{
    date: `${number}-${number}-${number}`;
  }>;
}) {
  const { date } = await props.params;
  const user = (await auth())?.user;

  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const isToday = date === dateToString(TZDate.tz(timeZone));

  const dismissTo = isToday ? "/diary" : (`/diary/${date}` as const);

  if (!user) {
    return null;
  }

  return (
    <Modal dismissTo={dismissTo}>
      <div className="h-screen w-full max-w-3xl overflow-auto overscroll-contain rounded-xl bg-white p-2 shadow-xl shadow-black/50">
        <DiaryNewWorkout date={date} user={user} />
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
