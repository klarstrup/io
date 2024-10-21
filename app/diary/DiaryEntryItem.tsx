"use client";
import Link from "next/link";
import type { DiaryEntry } from "../../lib";
import { exercises, TagType } from "../../models/exercises";
import { WorkoutData } from "../../models/workout";

export function DiaryEntryItem({
  pickedDate,
  date,
  diaryEntry,
}: {
  pickedDate?: `${number}-${number}-${number}`;
  date: `${number}-${number}-${number}`;
  diaryEntry?: DiaryEntry;
}) {
  const { food, workouts } = diaryEntry || {};

  const dayTotalEnergy = food?.reduce(
    (acc, foodEntry) => acc + foodEntry.nutritional_contents.energy.value,
    0,
  );
  const dayTotalProtein = food?.reduce(
    (acc, foodEntry) => acc + (foodEntry.nutritional_contents.protein || 0),
    0,
  );

  return (
    <Link
      key={date}
      href={date === pickedDate ? `/diary` : `/diary/${date}`}
      style={{
        background: "white",
        display: "flex",
        flexDirection: "column",
        padding: "0.25em",
      }}
      className={"diary-entry flex-1 border-[0.5px] border-black/25"}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            flex: 1,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <big>
            <b style={{ lineHeight: 1.25, whiteSpace: "nowrap" }}>
              {date.split("-")[2]}
            </b>
          </big>
        </div>
      </div>
      <div
        style={{
          flex: "1",
          display: "flex",
          flexDirection: "column",
          flexWrap: "wrap",
        }}
      >
        <div>
          {workouts?.length ? <WorkoutsSummary workouts={workouts} /> : null}
          {dayTotalEnergy && dayTotalProtein ? (
            <div
              style={{
                fontSize: "0.25em",
                padding: "0.25em",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.25em",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <small style={{ paddingLeft: "0.5em" }}>
                <div>{Math.round(dayTotalEnergy)} kcal</div>
                <div>{Math.round(dayTotalProtein)}g protein</div>
              </small>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function WorkoutsSummary({
  workouts,
}: {
  workouts: (WorkoutData & { _id: string })[];
}) {
  const exercisesDone = new Set<number>();

  for (const workout of workouts) {
    for (const { exerciseId } of workout.exercises) {
      exercisesDone.add(exerciseId);
    }
  }

  return (
    <div
      style={{
        fontSize: "1.5em",
        padding: "0.25em",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.25em",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
      }}
    >
      {Array.from(exercisesDone)
        .sort()
        .map((exerciseId) => {
          const exercise = exercises.find(({ id }) => exerciseId === id)!;

          return (
            <span key={exercise.id} title={exercise.name}>
              {exercise.name === "Bouldering" ? (
                "🧗‍♀️"
              ) : exercise.tags?.some(
                  (tag) =>
                    tag.type === TagType.Equipment && tag.name === "Barbell",
                ) ? (
                "🏋️‍♀️"
              ) : exercise.tags?.some(
                  (tag) =>
                    tag.type === TagType.Equipment &&
                    (tag.name === "Dumbbell" ||
                      tag.name === "EZ Bar" ||
                      tag.name === "Cables" ||
                      tag.name === "Machine"),
                ) ? (
                "💪"
              ) : exercise.tags?.some(
                  (tag) =>
                    tag.type === TagType.MuscleGroup && tag.name === "Cardio",
                ) ? (
                "🏃‍♀️"
              ) : exercise.tags?.some(
                  (tag) =>
                    tag.type === TagType.Type && tag.name === "Calisthenics",
                ) ? (
                "🤸🏻"
              ) : (
                <span
                  style={{
                    fontSize: "0.125em",
                    display: "inline-block",
                    maxWidth: "12em",
                  }}
                >
                  {exercise.name}
                </span>
              )}
            </span>
          );
        })}
    </div>
  );
}
