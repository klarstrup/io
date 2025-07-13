import { TZDate } from "@date-fns/tz";
import {
  eachMonthOfInterval,
  endOfMonth,
  startOfMonth,
  subYears,
} from "date-fns";
import { auth } from "../../../auth";
import { Modal } from "../../../components/Modal";
import { SendType } from "../../../models/exercises";
import {
  getSetGrade,
  type WorkoutExercise,
  type WorkoutExerciseSet,
} from "../../../models/workout";
import { MaterializedWorkoutsView } from "../../../models/workout.server";
import { DEFAULT_TIMEZONE } from "../../../utils";
import { mostRecentlyScrapedAt } from "../actions";
import { DiaryAgenda } from "../DiaryAgenda";
import { DiaryPoller } from "../DiaryPoller";
import { KeyHandler } from "./KeyHandler";

export async function calculateFlashRateByMonth(userId: string, now: Date) {
  const months = eachMonthOfInterval({
    start: startOfMonth(subYears(now, 2)),
    end: endOfMonth(now),
  });

  const flashRateByMonth: unknown[] = [];
  for (const month of months) {
    const monthKey = month.toISOString().slice(0, 7); // YYYY-MM

    const workout = await MaterializedWorkoutsView.aggregate<{
      workedOutAt: Date;
      exercise: WorkoutExercise;
      location: string;
    }>([
      {
        $match: {
          userId,
          "exercises.exerciseId": 2001,
          workedOutAt: { $gte: startOfMonth(month), $lt: endOfMonth(month) },
          deletedAt: { $exists: false },
        },
      },
      { $sort: { workedOutAt: -1 } },
      {
        $project: {
          _id: 0,
          location: 1,
          workedOutAt: 1,
          exercise: {
            $first: {
              $filter: {
                input: "$exercises",
                as: "exercise",
                cond: { $eq: ["$$exercise.exerciseId", 2001] },
              },
            },
          },
        },
      },
    ]).toArray();

    const gradePredicate = (set: WorkoutExerciseSet & { location: string }) => {
      const inputGrade = getSetGrade(set, set.location);
      if (inputGrade) return inputGrade >= 6.67 && inputGrade < 6.83;
    };

    const sets = workout
      .flatMap((w) =>
        (w.exercise.sets || []).map((set) => ({
          ...set,
          location: w.location,
        })),
      )
      .filter(gradePredicate);

    const sendSets = sets.filter(
      (set) =>
        set.inputs[2]?.value === SendType.Flash ||
        set.inputs[2]?.value === SendType.Top,
    );
    const flashSets = sendSets.filter(
      (set) => set.inputs[2]?.value === SendType.Flash,
    );

    flashRateByMonth.push({
      month: monthKey,
      totalSets: sets.length,
      sendSets: sendSets.length,
      flashSets: flashSets.length,
      flashRate: (flashSets.length / sendSets.length).toLocaleString("en-US", {
        style: "percent",
      }),
    });
  }

  console.table(flashRateByMonth);
}

export default async function DiaryDayModal(props: {
  params: Promise<{ date: `${number}-${number}-${number}` }>;
}) {
  const { date } = await props.params;
  const user = (await auth())?.user;

  if (!user) {
    return (
      <div>
        <p>Not logged in</p>
      </div>
    );
  }

  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);

  return (
    <Modal dismissTo={`/diary`}>
      <DiaryPoller
        mostRecentlyScrapedAtAction={mostRecentlyScrapedAt}
        loadedAt={now}
        userId={user.id}
      />
      <KeyHandler date={date} />
      <div className="h-screen w-full max-w-3xl overflow-auto overscroll-contain rounded-xl bg-white p-2 shadow-xl shadow-black/50">
        <DiaryAgenda user={user} date={date} isModal />
      </div>
    </Modal>
  );
}
