"use client";
import { compareDesc } from "date-fns";
import { Session } from "next-auth";
import Link from "next/link";
import { useId } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import Select, { components, OnChangeValue } from "react-select";
import { updateUserExerciseSchedules } from "../app/diary/actions";
import { exercises } from "../models/exercises";
import { IWorkoutExercisesView } from "../models/workout.server";
import type { ExerciseSchedule } from "../sources/fitocracy";
import { FieldSetX } from "./FieldSet";

export default function UserStuffWorkoutScheduleForm({
  user,
  exercisesStats,
}: {
  user: Session["user"];
  exercisesStats: IWorkoutExercisesView[];
}) {
  const {
    handleSubmit,
    register,
    reset,
    control,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm<{ exerciseSchedules: ExerciseSchedule[] }>({
    defaultValues: { exerciseSchedules: user?.exerciseSchedules ?? [] },
  });

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: "exerciseSchedules",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: "1em",
      }}
    >
      <form
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onSubmit={handleSubmit(async (data) => {
          const schedules = data.exerciseSchedules;
          const newSchedules = await updateUserExerciseSchedules(
            user.id,
            schedules,
          );

          reset(
            newSchedules
              ? { exerciseSchedules: newSchedules }
              : { exerciseSchedules: user.exerciseSchedules },
          );
        })}
        className="flex min-w-[50%] flex-1 flex-col gap-1"
      >
        <div className="flex items-center justify-evenly">
          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className={
              "rounded-md px-4 py-2 text-sm font-semibold " +
              (isDirty
                ? "bg-blue-600 text-white"
                : "bg-gray-300 text-gray-600") +
              " hover:bg-blue-700 hover:text-white" +
              (isSubmitting ? " cursor-not-allowed" : "") +
              (isDirty ? " cursor-pointer" : "") +
              (isSubmitting ? " opacity-50" : "")
            }
          >
            Update
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {fields.map((field, index) => {
            const exercise = exercises.find(
              (exercise) => exercise.id === field.exerciseId,
            );
            if (!exercise) {
              throw new Error(`Exercise with ID ${field.exerciseId} not found`);
            }
            return (
              <FieldSetX
                key={field.id}
                legend={
                  <div className="-ml-2 flex flex-1 gap-1 text-sm font-semibold">
                    <Link
                      href={`/diary/exercises/${exercise.id}`}
                      style={{ color: "#edab00" }}
                    >
                      {[exercise.name, ...exercise.aliases]
                        .filter((name) => name.length >= 4)
                        .sort((a, b) => a.length - b.length)[0]!
                        .replace("Barbell", "")}
                    </Link>
                  </div>
                }
                className="flex flex-col gap-1"
              >
                <label>
                  <input
                    type="checkbox"
                    {...register(`exerciseSchedules.${index}.enabled`)}
                  />{" "}
                  Enabled
                </label>
                <select
                  {...register(`exerciseSchedules.${index}.frequency.days`, {
                    valueAsNumber: true,
                  })}
                  className="flex-1"
                >
                  <option value={1}>Daily</option>
                  <option value={2}>Every other day</option>
                  <option value={3}>Every third day</option>
                  <option value={4}>Every fourth day</option>
                  <option value={5}>Every fifth day</option>
                  <option value={6}>Every sixth day</option>
                  <option value={7}>Weekly</option>
                </select>
                <div className="flex whitespace-nowrap">
                  Working Sets:{" "}
                  <input
                    type="number"
                    {...register(`exerciseSchedules.${index}.workingSets`, {
                      valueAsNumber: true,
                    })}
                    className="w-1/3"
                  />{" "}
                  x{" "}
                  <input
                    type="number"
                    {...register(`exerciseSchedules.${index}.workingReps`, {
                      valueAsNumber: true,
                    })}
                    className="w-1/3"
                  />{" "}
                  Reps
                </div>
                <label>
                  Deload Factor:{" "}
                  <input
                    type="number"
                    step={0.01}
                    {...register(`exerciseSchedules.${index}.deloadFactor`, {
                      valueAsNumber: true,
                    })}
                  />
                </label>
                <div className="flex gap-1">
                  <label>
                    Base Weight:{" "}
                    <input
                      type="number"
                      {...register(`exerciseSchedules.${index}.baseWeight`, {
                        valueAsNumber: true,
                      })}
                    />
                  </label>
                  <label>
                    Increment:{" "}
                    <input
                      type="number"
                      step={0.01}
                      {...register(`exerciseSchedules.${index}.increment`, {
                        valueAsNumber: true,
                      })}
                    />
                  </label>
                </div>
              </FieldSetX>
            );
          })}
          <Select
            components={{
              Input: (props) => (
                <components.Input
                  {...props}
                  aria-activedescendant={undefined}
                />
              ),
            }}
            instanceId={useId()}
            isDisabled={isSubmitting}
            placeholder="Add exercise schedule..."
            options={exercises
              .map((exercise) => ({
                ...exercise,
                stats: exercisesStats.find(
                  (stat) => stat.exerciseId === exercise.id,
                ),
              }))
              .sort((a, b) =>
                compareDesc(
                  a.stats?.workedOutAt ?? new Date(0),
                  b.stats?.workedOutAt ?? new Date(0),
                ),
              )
              .filter(
                ({ id }) => !fields.some((field) => field.exerciseId === id),
              )
              .map(({ id, name, aliases, stats }) => ({
                label:
                  `${name} ${
                    aliases.length > 1
                      ? `(${new Intl.ListFormat("en-DK", {
                          type: "disjunction",
                        }).format(aliases)})`
                      : aliases.length === 1
                        ? `(${aliases[0]})`
                        : ""
                  }` + (stats ? ` (${stats.exerciseCount})` : ""),
                value: id,
              }))}
            onChange={(
              selected: OnChangeValue<{ label: string; value: number }, false>,
            ) => {
              if (!selected) return;

              append({
                exerciseId: selected.value,
                enabled: true,
                frequency: { days: 5 },
              });
            }}
          />
        </div>
      </form>
    </div>
  );
}
