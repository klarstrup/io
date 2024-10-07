"use client";
import { compareAsc } from "date-fns";
import type { Session } from "next-auth";
import { type ReactNode, useState } from "react";
import type { DiaryEntry } from "../../lib";
import type { getNextSets } from "../../models/workout.server";
import { EntryAdder } from "./EntryAdder";
import { FoodEntry } from "./FoodEntry";
import WorkoutEntry from "./WorkoutEntry";
import { WorkoutForm } from "./WorkoutForm";

export function DiaryAgenda({
  diaryEntry,
  user,
  locations,
  nextSets,
  children,
}: {
  diaryEntry: [`${number}-${number}-${number}`, DiaryEntry];
  user: Session["user"];
  locations: string[];
  nextSets: Awaited<ReturnType<typeof getNextSets>>;
  children?: ReactNode | ReactNode[];
}) {
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);

  const [date, { food, workouts }] = diaryEntry;

  const dayTotalEnergy = food?.reduce(
    (acc, foodEntry) => acc + foodEntry.nutritional_contents.energy.value,
    0
  );
  const dayTotalProtein = food?.reduce(
    (acc, foodEntry) => acc + (foodEntry.nutritional_contents.protein || 0),
    0
  );

  return (
    <div
      key={date}
      style={{
        boxShadow: "0 0 2em rgba(0, 0, 0, 0.6)",
        borderRadius: "1.5em",
        background: "white",
        display: "flex",
        flexDirection: "column",
        padding: "0.5em",
      }}
    >
      <div
        style={{
          marginBottom: "0.5em",
          marginLeft: "0.5em",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, lineHeight: 1, display: "flex" }}>
          <big>
            <big>
              <big>
                <b>Today</b> <span style={{ fontSize: "0.75em" }}>{date}</span>
              </big>
            </big>
          </big>
          {dayTotalEnergy && dayTotalProtein ? (
            <small style={{ paddingLeft: "0.5em" }}>
              <div>{Math.round(dayTotalEnergy)} kcal</div>
              <div>{Math.round(dayTotalProtein)}g protein</div>
            </small>
          ) : null}
        </div>
        <EntryAdder
          diaryEntry={diaryEntry}
          user={user}
          onAddWorkout={() => setIsAddingWorkout(true)}
        />
      </div>
      <div
        style={{
          flex: "1",
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: "1",
            display: "flex",
            flexDirection: "column",
            flexWrap: "wrap",
          }}
        >
          <fieldset>
            <legend>Food</legend>
            <FoodEntry foodEntries={food} />
          </fieldset>
          <fieldset>
            <legend>Workouts</legend>
            {workouts?.length
              ? Array.from(workouts)
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
              : null}
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
          </fieldset>
        </div>
        {children}
      </div>
    </div>
  );
}
