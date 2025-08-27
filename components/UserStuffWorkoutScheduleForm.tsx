"use client";
import { compareDesc, isFuture, isValid } from "date-fns";
import { Session } from "next-auth";
import Link from "next/link";
import { useId } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import Select, { components, OnChangeValue } from "react-select";
import { updateUserExerciseSchedules } from "../app/diary/actions";
import { exercises, exercisesById, InputType } from "../models/exercises";
import { IWorkoutExercisesView } from "../models/workout.server";
import type { ExerciseSchedule } from "../sources/fitocracy";
import { FieldSetY } from "./FieldSet";

/**
 * Create a date YYYY-MM-DD date string that is typecasted as a `Date`.
 * Hack when using `defaultValues` in `react-hook-form`
 * This is because `react-hook-form` doesn't support `defaultValue` of type `Date` even if the types say so
 */
function dateToInputDate(date?: Date) {
  if (!date || !isValid(date)) return undefined;

  return date.toJSON().slice(0, 10) as unknown as Date;
}

const exerciseSchedulesForForm = (exerciseSchedules?: ExerciseSchedule[]) =>
  exerciseSchedules?.map((eS) => ({
    ...eS,
    snoozedUntil:
      eS.snoozedUntil && isFuture(eS.snoozedUntil)
        ? dateToInputDate(eS.snoozedUntil)
        : undefined,
  }));

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
    defaultValues: {
      exerciseSchedules: exerciseSchedulesForForm(user?.exerciseSchedules),
    },
  });

  const { fields, append } = useFieldArray({
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
          reset({
            exerciseSchedules: exerciseSchedulesForForm(
              newSchedules ? newSchedules : user.exerciseSchedules,
            ),
          });
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
            const exercise = exercisesById[field.exerciseId];
            if (!exercise) {
              throw new Error(`Exercise with ID ${field.exerciseId} not found`);
            }
            return (
              <FieldSetY
                key={field.id}
                legend={
                  <div className="-ml-2 flex flex-1 gap-1 text-sm font-semibold">
                    <Link
                      prefetch={false}
                      href={`/diary/exercises/${exercise.id}`}
                      style={{ color: "#edab00" }}
                    >
                      {[exercise.name, ...exercise.aliases]
                        .filter((name) => name.length >= 4)
                        .sort((a, b) => a.length - b.length)[0]!
                        .replace("Barbell", "")}
                    </Link>
                    <label>
                      <input
                        type="checkbox"
                        {...register(`exerciseSchedules.${index}.enabled`)}
                      />{" "}
                      Enabled
                    </label>
                  </div>
                }
                className="flex flex-col gap-1"
              >
                {watch("exerciseSchedules")?.[index]?.enabled ? (
                  <>
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <label className="flex gap-1">
                        Snoozed until:
                        <input
                          type="date"
                          {...register(
                            `exerciseSchedules.${index}.snoozedUntil`,
                            { valueAsDate: true },
                          )}
                          className={
                            "border-b-2 border-gray-200 focus:border-gray-500"
                          }
                        />
                      </label>
                      <label className="[grid-column:span_2] flex gap-1">
                        Frequency:
                        <select
                          {...register(
                            `exerciseSchedules.${index}.frequency.days`,
                            { valueAsNumber: true },
                          )}
                          className="w-full"
                        >
                          <option value={1}>Daily</option>
                          <option value={7 / 4}>Quadrantweekly</option>
                          <option value={7 / 3}>Trientweekly</option>
                          <option value={7 / 2}>Semiweekly</option>
                          <option value={7}>Weekly</option>
                          <option value={7 * 2}>Biweekly</option>
                          <option value={7 * 3}>Triweekly</option>
                          <option value={7 * 4}>Quadriweekly</option>
                          <option value={365 / 4}>Quarterly</option>
                          <option value={365 / 2}>Semiannually</option>
                          <option value={365}>Annually</option>
                        </select>
                      </label>
                      <label className="flex gap-1">
                        Sets:
                        <input
                          type="number"
                          {...register(
                            `exerciseSchedules.${index}.workingSets`,
                            { valueAsNumber: true },
                          )}
                          className="w-full"
                        />
                      </label>
                      {exercise.inputs.some(
                        (input) => input.type === InputType.Reps,
                      ) &&
                      !exercise.inputs.every(
                        (input) => input.type === InputType.Reps,
                      ) ? (
                        <>
                          <label className="flex gap-1">
                            Reps:
                            <input
                              type="number"
                              {...register(
                                `exerciseSchedules.${index}.workingReps`,
                                { valueAsNumber: true },
                              )}
                              className="w-full"
                            />
                          </label>
                        </>
                      ) : null}
                      {exercise.inputs.some(
                        (input) =>
                          input.type === InputType.Weight ||
                          input.type === InputType.Weightassist ||
                          input.type === InputType.Time ||
                          input.type === InputType.Reps,
                      ) ? (
                        <>
                          <label className="flex gap-1">
                            Base Effort:
                            <input
                              type="number"
                              {...register(
                                `exerciseSchedules.${index}.baseWeight`,
                                { valueAsNumber: true },
                              )}
                              className="w-full"
                            />
                            {
                              exercise.inputs.find(
                                (input) =>
                                  input.type === InputType.Weight ||
                                  input.type === InputType.Weightassist ||
                                  input.type === InputType.Time ||
                                  input.type === InputType.Reps,
                              )?.metric_unit
                            }
                          </label>
                          <label className="flex gap-1">
                            Increment:
                            <input
                              type="number"
                              step={0.01}
                              {...register(
                                `exerciseSchedules.${index}.increment`,
                                { valueAsNumber: true },
                              )}
                              className="w-full"
                            />
                            {
                              exercise.inputs.find(
                                (input) =>
                                  input.type === InputType.Weight ||
                                  input.type === InputType.Weightassist ||
                                  input.type === InputType.Time ||
                                  input.type === InputType.Reps,
                              )?.metric_unit
                            }
                          </label>
                          <label className="flex gap-1">
                            Deload:
                            <input
                              type="number"
                              step={0.01}
                              {...register(
                                `exerciseSchedules.${index}.deloadFactor`,
                                { valueAsNumber: true },
                              )}
                              className="w-full"
                            />
                          </label>
                        </>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </FieldSetY>
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
