import { auth } from "../../../../../auth";
import DiaryWorkout from "./DiaryWorkout";

export default async function DiaryWorkoutModal(props: {
  params: Promise<{
    date: `${number}-${number}-${number}`;
    workoutId: string;
  }>;
}) {
  const { date, workoutId } = await props.params;
  const user = (await auth())?.user;

  if (!user) return null;

  //  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  //  const isToday = date === dateToString(TZDate.tz(timeZone));
  //  const dismissTo = isToday ? "/diary" : (`/diary/${date}` as const);

  return (
    <div className="min-h-screen w-full max-w-3xl rounded-xl bg-white p-2 shadow-xl shadow-black/50">
      <DiaryWorkout date={date} workoutId={workoutId} />
    </div>
  );
}
