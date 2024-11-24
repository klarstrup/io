"use client";
import { TZDate } from "@date-fns/tz";
import type { Session } from "next-auth";
import Link from "next/link";
import type { DiaryEntry } from "../../lib";
import { exercises, TagType } from "../../models/exercises";
import { isClimbingExercise, WorkoutData } from "../../models/workout";
import {
  dateToString,
  DEFAULT_TIMEZONE,
  getSchemeCategory10Color,
  uniqueBy,
} from "../../utils";

export function DiaryEntryItem({
  user,
  date,
  diaryEntry,
}: {
  user: Session["user"];
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

  const now = TZDate.tz(user.timeZone || DEFAULT_TIMEZONE);
  const tzDate = new TZDate(date).withTimeZone(
    user.timeZone || DEFAULT_TIMEZONE,
  );
  const isToday = date === dateToString(now);
  const isFuture = now < tzDate;

  if (isFuture && !isToday) {
    return <div className="flex-1 border-[0.5px] border-black/0">&nbsp;</div>;
  }

  return (
    <Link
      key={date}
      prefetch={false}
      href={`/diary/${date}`}
      style={{
        background: getSchemeCategory10Color(Number(date.split("-")[1])) + "50",
        display: "flex",
        flexDirection: "column",
        padding: "0.25em",
        maxWidth: "calc(100% / 7)",
        width: "calc(100% / 7)",
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
          className={
            "flex flex-1 items-center justify-center text-lg leading-none " +
            (isToday ? "font-bold" : "font-normal")
          }
        >
          {date.split("-")[2]}
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
        <div className="min-h-20">
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
      {uniqueBy(
        Array.from(exercisesDone)
          .sort()
          .map((exerciseId) => {
            const exercise = exercises.find(({ id }) => exerciseId === id)!;

            return {
              id: exercise.id,
              name: exercise.name,
              icon: isClimbingExercise(exercise.id) ? (
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
              ),
            };
          }),
        ({ icon }) => icon,
      ).map(({ id, name, icon }) => (
        <span key={id} title={name}>
          {icon}
        </span>
      ))}
    </div>
  );
}
