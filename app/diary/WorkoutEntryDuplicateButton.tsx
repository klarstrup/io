"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Workout } from "../../graphql.generated";

export function WorkoutEntryDuplicateButton({ workout }: { workout: Workout }) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  return (
    <button
      style={{ color: "#edab00" }}
      className="cursor-pointer text-xs font-semibold"
      disabled={isUpdating || Math.random() < 0} // Disable button for now because the upserting below needs to be fixed
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={async () => {
        try {
          if (isUpdating) return;
          setIsUpdating(true);

          const nowDays = new Date();
          const now = new Date(
            nowDays.getFullYear(),
            nowDays.getMonth(),
            nowDays.getDate(),
            workout.workedOutAt.getHours(),
            workout.workedOutAt.getMinutes(),
            workout.workedOutAt.getSeconds(),
          );
          const newWorkout = { ...workout };

          // Reset timestamps
          newWorkout.workedOutAt = now;
          newWorkout.createdAt = now;
          newWorkout.updatedAt = now;

          newWorkout.exercises = newWorkout.exercises.map((exercise) => ({
            ...exercise,
            sets: exercise.sets.map((set) => ({
              ...set,
              createdAt: now,
              updatedAt: now,
            })),
          }));

          // @ts-expect-error - intentionally voiding this here
          delete newWorkout._id;
          // @ts-expect-error - intentionally voiding this here
          delete newWorkout.id;

          // Replace upsertWorkout with specific duplicateWorkout mutation later
          return;
          /*
          const newWorkoutId = await upsertWorkout(newWorkout);

          const dateStr = dateToString(now);
          router.push(`/diary/${dateStr}/workout/${newWorkoutId}`);
          */
        } catch (error) {
          console.error("Error duplicating workout:", error);
        } finally {
          setIsUpdating(false);
        }
      }}
    >
      Copy to today
    </button>
  );
}
