/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { TZDate } from "@date-fns/tz";
import { differenceInDays, startOfDay } from "date-fns";
import type { Session } from "next-auth";
import { useEffect, useId } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import Select from "react-select";
import Creatable from "react-select/creatable";
import { StealthButton } from "../../components/StealthButton";
import { frenchRounded } from "../../grades";
import {
  exercises,
  InputType,
  Unit,
  type ExerciseData,
} from "../../models/exercises";
import {
  WorkoutExerciseSet,
  WorkoutExerciseSetInput,
  WorkoutSource,
  type WorkoutData,
} from "../../models/workout";
import type { getNextSets } from "../../models/workout.server";
import { deleteWorkout, upsertWorkout } from "./actions";
import { NextSets } from "./NextSets";
import { DEFAULT_TIMEZONE } from "../../utils";

function isValidDate(date: Date) {
  return !isNaN(date.getTime());
}

/**
 * Create a date YYYY-MM-DD date string that is typecasted as a `Date`.
 * Hack when using `defaultValues` in `react-hook-form`
 * This is because `react-hook-form` doesn't support `defaultValue` of type `Date` even if the types say so
 */
export function dateToInputDate(date?: Date) {
  if (!date || !isValidDate(date)) {
    return undefined;
  }
  return date.toJSON().slice(0, 10) as unknown as Date;
}

export function WorkoutForm({
  user,
  workout,
  date,
  onClose,
  locations,
  nextSets,
}: {
  user: Session["user"];
  workout?: WorkoutData & { _id?: string };
  date?: string;
  onClose?: () => void;
  locations: string[];
  nextSets?: Awaited<ReturnType<typeof getNextSets>>;
}) {
  const timeZone = user.timeZone ?? DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);
  const todayDate = `${now.getFullYear()}-${
    now.getMonth() + 1
  }-${now.getDate()}`;

  const {
    handleSubmit,
    register,
    reset,
    control,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm<WorkoutData & { _id?: string }>({
    defaultValues: workout
      ? { ...workout, workedOutAt: dateToInputDate(workout?.workedOutAt) }
      : undefined,
  });
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: "exercises",
  });

  const dueSets = nextSets
    ?.filter(
      (nextSet) => differenceInDays(startOfDay(now), nextSet.workedOutAt) > 3,
    )
    .filter(
      (nextSet) =>
        !watch("exercises")?.some(
          (exerciseValue) => exerciseValue.exerciseId === nextSet.exerciseId,
        ),
    );

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
          const newWorkout: WorkoutData & { _id?: string } = {
            _id: workout?._id,
            userId: user.id,
            // Shit that will change
            workedOutAt: data.workedOutAt ?? workout?.workedOutAt,
            createdAt: workout?.createdAt ?? new Date(),
            updatedAt: new Date(),
            exercises: data.exercises ?? workout?.exercises,
            source: WorkoutSource.Self,
            location: data.location ?? workout?.location,
          };
          console.log({ workout, data, newWorkout });
          await upsertWorkout(newWorkout);
          onClose?.();
          reset(
            workout
              ? {
                  ...workout,
                  workedOutAt: dateToInputDate(workout?.workedOutAt),
                }
              : { exercises: [] },
          );
        })}
        className="min-w-32 flex-1"
      >
        {onClose ? (
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        ) : null}
        <button type="submit" disabled={!isDirty || isSubmitting}>
          {workout ? "Update" : "Create"}
        </button>
        {workout?._id ? (
          <button
            disabled={isSubmitting}
            type="button"
            onClick={() => deleteWorkout(workout._id!)}
          >
            Delete
          </button>
        ) : null}
        <input
          type="date"
          {...register("workedOutAt", { valueAsDate: true })}
          defaultValue={String(dateToInputDate(workout?.workedOutAt ?? now))}
          hidden={!workout && todayDate !== date}
          className="border-b-2 border-gray-200 focus:border-gray-500"
        />
        <Controller
          name="location"
          control={control}
          render={({ field }) => (
            <Creatable<{ label: string; value: string }, false>
              placeholder="Pick location..."
              isDisabled={isSubmitting}
              isMulti={false}
              isClearable={true}
              options={locations.map((location) => ({
                label: location,
                value: location,
              }))}
              {...field}
              value={
                field.value ? { label: field.value, value: field.value } : null
              }
              onChange={(selected) => {
                if (selected) field.onChange(selected.value);
              }}
            />
          )}
        />
        <div>
          {fields.map((field, index) => {
            const exercise = exercises.find(
              (exercise) => exercise.id === field.exerciseId,
            );
            if (!exercise) {
              throw new Error(`Exercise with ID ${field.exerciseId} not found`);
            }
            const nextExerciseSet = nextSets?.find(
              (nextSet) => nextSet.exerciseId === exercise.id,
            );
            return (
              <fieldset key={field.id} className="flex flex-col">
                <legend className="flex-1 text-sm font-semibold">
                  {exercise.name}{" "}
                  <StealthButton
                    onClick={() => remove(index)}
                    disabled={isSubmitting}
                    className="leading-[0]"
                  >
                    ❌
                  </StealthButton>
                  <StealthButton
                    onClick={() => {
                      const newIndex = index - 1;
                      const destination = fields[newIndex]!;
                      const source = fields[index]!;
                      update(index, destination);
                      update(newIndex, source);
                    }}
                    disabled={index === 0 || isSubmitting}
                    className="leading-[0]"
                  >
                    ⬆️
                  </StealthButton>
                  <StealthButton
                    onClick={() => {
                      const newIndex = index + 1;
                      const destination = fields[newIndex]!;
                      const source = fields[index]!;
                      update(index, destination);
                      update(newIndex, source);
                    }}
                    disabled={index === fields.length - 1 || isSubmitting}
                    className="leading-[0]"
                  >
                    ⬇️
                  </StealthButton>
                </legend>
                {nextExerciseSet ? (
                  <div>
                    <small>
                      Goal {nextExerciseSet.nextWorkingSets}x
                      {nextExerciseSet.nextWorkingSetsReps}x
                      {nextExerciseSet.nextWorkingSetsWeight}
                      kg based on last set{" "}
                      {nextExerciseSet.workedOutAt.toLocaleDateString("da-DK")}
                    </small>
                  </div>
                ) : null}
                <SetsForm
                  control={control}
                  register={register}
                  parentIndex={index}
                  exercise={exercise}
                />
              </fieldset>
            );
          })}
          <Select
            instanceId={useId()}
            isDisabled={isSubmitting}
            placeholder="Add exercise..."
            options={exercises
              .filter(
                ({ id }) => !fields.some((field) => field.exerciseId === id),
              )
              .map(({ id, name, aliases }) => ({
                label: `${name} ${
                  aliases.length > 1
                    ? `(${new Intl.ListFormat("en-DK", {
                        type: "disjunction",
                      }).format(aliases)})`
                    : aliases.length === 1
                      ? `(${aliases[0]})`
                      : ""
                }`,
                value: id,
              }))}
            onChange={(selected) => {
              if (!selected) return;

              append({ exerciseId: selected.value, sets: [] });
            }}
          />
        </div>
      </form>
      <div>
        {dueSets?.length ? (
          <div>
            <b>Due Sets:</b>
            <NextSets
              nextSets={dueSets}
              onAddExercise={(exerciseId) => {
                const exerciseDefinition = exercises.find(
                  (exercise) => exercise.id === exerciseId,
                )!;

                const goalWeight = dueSets.find(
                  (nextSet) => nextSet.exerciseId === exerciseId,
                )?.nextWorkingSetsWeight;

                const warmupIncrement =
                  ((goalWeight ?? NaN) - 20) / 10 >= 2 ? 20 : 10;

                const setWeights: number[] = [goalWeight ?? NaN];
                while (
                  setWeights[setWeights.length - 1]! >
                  20 + warmupIncrement
                ) {
                  setWeights.push(
                    setWeights[setWeights.length - 1]! - warmupIncrement,
                  );
                }

                const sets = setWeights.reverse().map(
                  (setWeight): WorkoutExerciseSet => ({
                    inputs: exerciseDefinition.inputs.map(
                      (input): WorkoutExerciseSetInput => ({
                        value:
                          input.type === InputType.Weight ? setWeight : NaN,
                        unit: input.metric_unit,
                      }),
                    ),
                  }),
                );

                append({ exerciseId, sets });
              }}
            />
          </div>
        ) : null}
        {nextSets?.filter(
          (nextSet) =>
            differenceInDays(startOfDay(now), nextSet.workedOutAt) <= 3,
        ).length ? (
          <div>
            <small>
              <b>Future Sets:</b>
              <NextSets
                nextSets={nextSets.filter(
                  (nextSet) =>
                    differenceInDays(startOfDay(now), nextSet.workedOutAt) <= 3,
                )}
              />
            </small>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SetsForm({
  control,
  parentIndex,
  register,
  exercise,
}: {
  control: ReturnType<
    typeof useForm<WorkoutData & { _id?: string }>
  >["control"];
  register: ReturnType<
    typeof useForm<WorkoutData & { _id?: string }>
  >["register"];
  parentIndex: number;
  exercise: ExerciseData;
}) {
  const {
    fields: sets,
    append,
    update,
    remove,
  } = useFieldArray({
    control,
    name: `exercises.${parentIndex}.sets`,
  });

  useEffect(() => {
    exercise.inputs.forEach((input, inputIndex) => {
      if (input.allowed_units && input.allowed_units.length > 1) return;

      const unit = input.metric_unit ?? input.allowed_units?.[0]?.name;

      sets.forEach((set, setIndex) => {
        if (set.inputs[inputIndex]!.unit === unit) return;

        update(setIndex, {
          ...set,
          inputs: set.inputs.map((setInput, setInputIndex) =>
            setInputIndex === inputIndex ? { ...setInput, unit } : setInput,
          ),
        });
      });
    });
  }, [exercise.inputs, sets, update]);

  return (
    <table
      style={{
        display: "block",
        width: "100%",
        borderCollapse: "collapse",
        borderSpacing: 0,
      }}
    >
      <thead>
        <tr>
          <th>
            <StealthButton
              onClick={() =>
                append({
                  inputs: exercise.inputs.map((input, inputIndex) => {
                    const lastSetInput =
                      sets[sets.length - 1]?.inputs[inputIndex];

                    return {
                      id: input.id,
                      value: lastSetInput?.value ?? 0,
                      unit:
                        lastSetInput?.unit ??
                        input.metric_unit ??
                        input.allowed_units?.[0]?.name,
                    };
                  }),
                })
              }
              className="leading-[0]"
            >
              ➕
            </StealthButton>
          </th>
          {exercise.inputs.map((input, inputIndex) => (
            <th key={inputIndex} style={{ fontSize: "0.5em" }}>
              {input.display_name}{" "}
              <small>
                {input.allowed_units && input.allowed_units.length > 1 ? (
                  <select
                    value={sets[0]?.inputs[inputIndex]?.unit}
                    className="flex-1 [font-size:inherit]"
                    onChange={(event) => {
                      const unit = event.target.value as Unit;
                      sets.forEach((set, setIndex) => {
                        update(setIndex, {
                          ...set,
                          inputs: set.inputs.map((setInput, setInputIndex) =>
                            setInputIndex === inputIndex
                              ? { ...setInput, unit }
                              : setInput,
                          ),
                        });
                      });
                    }}
                  >
                    {[...input.allowed_units]
                      .sort((a, b) => {
                        return (
                          (a.name === input.metric_unit ? -1 : 1) -
                          (b.name === input.metric_unit ? -1 : 1)
                        );
                      })
                      .map((unit) => (
                        <option key={unit.name} value={unit.name}>
                          {unit.name}
                        </option>
                      ))}
                  </select>
                ) : input.metric_unit?.toLowerCase() !==
                    input.display_name.toLowerCase() &&
                  input.type !== InputType.Options &&
                  input.type !== InputType.Grade ? (
                  <>
                    (<span className="w-auto flex-1">{input.metric_unit}</span>)
                  </>
                ) : null}
              </small>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sets.map((set, index) => (
          <tr key={set.id}>
            <td style={{ fontSize: "0.8em", paddingRight: "2px" }}>
              {index + 1}.
            </td>
            <InputsForm
              control={control}
              register={register}
              parentIndex={parentIndex}
              setIndex={index}
              exercise={exercise}
            />
            <td>
              <div className="flex">
                <StealthButton
                  onClick={() => remove(index)}
                  className="leading-[0]"
                >
                  ❌
                </StealthButton>
                <StealthButton
                  onClick={() => {
                    const newIndex = index - 1;
                    const destination = sets[newIndex]!;
                    const source = sets[index]!;
                    update(index, destination);
                    update(newIndex, source);
                  }}
                  disabled={index === 0}
                  className="leading-[0]"
                >
                  ⬆️
                </StealthButton>
                <StealthButton
                  onClick={() => {
                    const newIndex = index + 1;
                    const destination = sets[newIndex]!;
                    const source = sets[index]!;
                    update(index, destination);
                    update(newIndex, source);
                  }}
                  disabled={index === sets.length - 1}
                  className="leading-[0]"
                >
                  ⬇️
                </StealthButton>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InputsForm({
  parentIndex,
  setIndex,
  register,
  exercise,
}: {
  control: ReturnType<
    typeof useForm<WorkoutData & { _id?: string }>
  >["control"];
  register: ReturnType<
    typeof useForm<WorkoutData & { _id?: string }>
  >["register"];
  parentIndex: number;
  setIndex: number;
  exercise: ExerciseData;
}) {
  return exercise.inputs.map((input) => (
    <td key={input.id}>
      <div className="flex">
        {input.type === InputType.Options && input.options ? (
          <select
            {...register(
              `exercises.${parentIndex}.sets.${setIndex}.inputs.${input.id}.value`,
            )}
            className="flex-1"
          >
            {input.hidden_by_default ? <option value={""}>---</option> : null}
            {input.options.map((option, i) => (
              <option key={option.value} value={i}>
                {option.value}
              </option>
            ))}
          </select>
        ) : null}
        {input.type === InputType.Weightassist && input.options ? (
          <select
            {...register(
              `exercises.${parentIndex}.sets.${setIndex}.inputs.${input.id}.assistType`,
            )}
            className="flex-1"
          >
            {input.hidden_by_default ? <option value="">---</option> : null}
            {input.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value}
              </option>
            ))}
          </select>
        ) : null}
        {input.type !== InputType.Options ? (
          input.type === InputType.Grade ? (
            <select
              {...register(
                `exercises.${parentIndex}.sets.${setIndex}.inputs.${input.id}.value`,
              )}
            >
              {input.hidden_by_default ? <option value={""}>---</option> : null}
              {frenchRounded.data.map(({ value, name }) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <input
              {...register(
                `exercises.${parentIndex}.sets.${setIndex}.inputs.${input.id}.value`,
                { valueAsNumber: true },
              )}
              type="number"
              onFocus={(e) => e.target.select()}
              step={input.metric_unit === Unit.Reps ? "1" : "0.01"}
              style={{ width: "64px", flex: 1, textAlign: "right" }}
              className="border-b-2 border-gray-200 focus:border-gray-500"
              onKeyDown={(e) => {
                const input = e.currentTarget;
                const formElements = input.form?.elements;
                if (!formElements) return;
                if (e.key == "Enter") {
                  const followingFormElements = Array.from(formElements).slice(
                    Array.from(formElements).indexOf(input) + 1,
                  );

                  for (const element of followingFormElements) {
                    if (
                      element instanceof HTMLInputElement &&
                      element.type === "number"
                    ) {
                      e.preventDefault();
                      e.stopPropagation();

                      element.focus();
                      break;
                    }
                  }
                }
              }}
            />
          )
        ) : null}
      </div>
    </td>
  ));
}
