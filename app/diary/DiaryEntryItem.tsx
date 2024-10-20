"use client";
import { TZDate } from "@date-fns/tz";
import { compareAsc } from "date-fns";
import type { Session } from "next-auth";
import { useState } from "react";
import type { DiaryEntry } from "../../lib";
import { exercises, TagType } from "../../models/exercises";
import { WorkoutData } from "../../models/workout";
import type { getNextSets } from "../../models/workout.server";
import { EntryAdder } from "./EntryAdder";
import { FoodEntry } from "./FoodEntry";
import WorkoutEntry from "./WorkoutEntry";
import { WorkoutForm } from "./WorkoutForm";
import { DEFAULT_TIMEZONE } from "../../utils";

export function DiaryEntryItem({
  diaryEntry,
  user,
  locations,
  nextSets,
}: {
  diaryEntry: [`${number}-${number}-${number}`, DiaryEntry];
  user: Session["user"];
  locations: string[];
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
}) {
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const timeZone = user.timeZone ?? DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);
  const todayStr = `${now.getFullYear()}-${
    now.getMonth() + 1
  }-${now.getDate()}`;

  const [date, { food, workouts }] = diaryEntry;

  const dayTotalEnergy = food?.reduce(
    (acc, foodEntry) => acc + foodEntry.nutritional_contents.energy.value,
    0,
  );
  const dayTotalProtein = food?.reduce(
    (acc, foodEntry) => acc + (foodEntry.nutritional_contents.protein || 0),
    0,
  );

  return (
    <div
      key={date}
      style={{
        boxShadow:
          date === todayStr
            ? "0 0 2em rgba(0, 0, 0, 0.6)"
            : "0 0 2em rgba(0, 0, 0, 0.2)",
        borderRadius: "1.5em",
        background: "white",
        display: "flex",
        flexDirection: "column",
        padding: "0.5em",
      }}
      className={"diary-entry" + (isExpanded ? " expanded" : "")}
    >
      <div
        style={{
          marginBottom: "0.5em",
          marginLeft: "0.5em",
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
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
            <big>
              <big>
                <b style={{ lineHeight: 1.25, whiteSpace: "nowrap" }}>{date}</b>
              </big>
            </big>
          </big>
        </div>
        {isExpanded ? (
          <EntryAdder
            diaryEntry={diaryEntry}
            user={user}
            onAddWorkout={() => setIsAddingWorkout(true)}
          />
        ) : null}
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
          {isExpanded ? (
            <FoodEntry foodEntries={food} />
          ) : (
            <div
              style={{
                fontSize: "1em",
                padding: "0.25em",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.25em",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {dayTotalEnergy && dayTotalProtein ? (
                <small style={{ paddingLeft: "0.5em" }}>
                  <div>{Math.round(dayTotalEnergy)} kcal</div>
                  <div>{Math.round(dayTotalProtein)}g protein</div>
                </small>
              ) : null}
            </div>
          )}
          {workouts?.length ? (
            isExpanded ? (
              Array.from(workouts)
                .sort((a, b) => compareAsc(a.workedOutAt, b.workedOutAt))
                ?.map((workout) => (
                  <WorkoutEntry
                    key={workout._id}
                    user={user}
                    workout={workout}
                    locations={locations}
                    nextSets={nextSets}
                  />
                ))
            ) : (
              <WorkoutsSummary workouts={workouts} />
            )
          ) : null}
          {isAddingWorkout ? (
            <fieldset>
              <legend>New workout</legend>
              <WorkoutForm
                date={date}
                user={user}
                locations={locations}
                nextSets={nextSets}
                onClose={() => setIsAddingWorkout(false)}
              />
            </fieldset>
          ) : null}
        </div>
      </div>
    </div>
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
        fontSize: "2em",
        padding: "0.25em",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.25em",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {Array.from(exercisesDone).map((exerciseId) => {
        const exercise = exercises.find(({ id }) => exerciseId === id)!;

        return (
          <span key={exercise.id}>
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
