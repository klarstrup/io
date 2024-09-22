/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import type { Session } from "next-auth";
import { useFieldArray, useForm } from "react-hook-form";
import Select from "react-select";
import { frenchRounded } from "../../grades";
import {
  exercises,
  InputType,
  Unit,
  type ExerciseData,
} from "../../models/exercises";
import { WorkoutSource, type WorkoutData } from "../../models/workout";
import { deleteWorkout, upsertWorkout } from "./actions";
import { TZDate } from "@date-fns/tz";

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
  onClose,
}: {
  user: Session["user"];
  workout?: WorkoutData & { _id?: string };
  onClose?: () => void;
}) {
  const {
    handleSubmit,
    register,
    reset,
    control,
    formState: { isDirty, isSubmitting },
  } = useForm<WorkoutData & { _id?: string }>({
    defaultValues: workout
      ? { ...workout, worked_out_at: dateToInputDate(workout?.worked_out_at) }
      : undefined,
  });
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: "exercises",
  });

  return (
    <form
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onSubmit={handleSubmit(async (data) => {
        if (!(typeof user.fitocracyUserId === "number")) {
          throw new Error("User has no Fitocracy user ID");
        }

        const newWorkout: WorkoutData & { _id?: string } = {
          _id: workout?._id,
          user_id: user.id,
          // Shit that will change
          worked_out_at: data.worked_out_at ?? workout?.worked_out_at,
          created_at: workout?.created_at ?? new Date(),
          updated_at: new Date(),
          exercises: data.exercises ?? workout?.exercises,
          source: WorkoutSource.Self,
        };
        console.log({ workout, data, newWorkout });
        await upsertWorkout(newWorkout);
        onClose?.();
        reset(
          workout
            ? {
                ...workout,
                worked_out_at: dateToInputDate(workout?.worked_out_at),
              }
            : { exercises: [] }
        );
      })}
    >
      {onClose ? (
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      ) : null}
      <button type="submit" disabled={!isDirty || isSubmitting}>
        {workout ? "Update" : "Create"}
      </button>
      <button
        type="button"
        disabled={!isDirty || isSubmitting}
        onClick={() => {
          reset(
            workout
              ? {
                  ...workout,
                  worked_out_at: dateToInputDate(workout?.worked_out_at),
                }
              : { exercises: [] }
          );
        }}
      >
        Reset
      </button>
      {workout?._id ? (
        <button
          disabled={isSubmitting}
          type="button"
          onClick={async () => {
            await deleteWorkout(workout._id!);
          }}
        >
          Delete
        </button>
      ) : null}
      <input
        type="date"
        {...register("worked_out_at", { valueAsDate: true })}
        defaultValue={
          workout
            ? String(dateToInputDate(workout?.worked_out_at))
            : String(dateToInputDate(TZDate.tz("Europe/Copenhagen")))
        }
      />
      <div>
        {fields.map((field, index) => {
          const exercise = exercises.find(
            (exercise) => exercise.id === field.exercise_id
          );
          if (!exercise) {
            throw new Error(`Exercise with ID ${field.exercise_id} not found`);
          }
          return (
            <div key={field.id}>
              <div style={{ display: "flex" }}>
                <header
                  style={{ flex: "1", fontWeight: 600, fontSize: "0.9em" }}
                >
                  {exercise.name}
                </header>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={isSubmitting}
                  style={{ padding: 0 }}
                >
                  ❌
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newIndex = index - 1;
                    const destination = fields[newIndex]!;
                    const source = fields[index]!;
                    update(index, destination);
                    update(newIndex, source);
                  }}
                  disabled={index === 0 || isSubmitting}
                  style={{ padding: 0 }}
                >
                  ⬆️
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newIndex = index + 1;
                    const destination = fields[newIndex]!;
                    const source = fields[index]!;
                    update(index, destination);
                    update(newIndex, source);
                  }}
                  disabled={index === fields.length - 1 || isSubmitting}
                  style={{ padding: 0 }}
                >
                  ⬇️
                </button>
              </div>
              <SetsForm
                control={control}
                register={register}
                parentIndex={index}
                exercise={exercise}
              />
            </div>
          );
        })}
        <Select
          isDisabled={isSubmitting}
          placeholder="Add exercise..."
          options={exercises
            .filter(
              ({ id }) => !fields.some((field) => field.exercise_id === id)
            )
            .map(({ id, name, aliases }) => ({
              label: `${name} ${
                aliases.length ? `(${aliases.join(", ")})` : ""
              }`,
              value: id,
            }))}
          onChange={(selected) => {
            if (!selected) return;

            append({
              exercise_id: selected.value,
              sets: [],
            });
          }}
        />
      </div>
    </form>
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
  return (
    <table
      style={{
        display: "block",
        width: "100%",
        borderCollapse: "collapse",
      }}
    >
      <thead>
        <tr>
          <th>
            <button
              type="button"
              onClick={() =>
                append({
                  inputs: exercise.inputs.map((input) => ({
                    id: input.id,
                    input_ordinal: input.input_ordinal,
                    value: sets[sets.length - 1]?.inputs[input.id]?.value ?? 0,
                    unit:
                      sets[sets.length - 1]?.inputs[input.id]?.unit ??
                      input.metric_unit ??
                      input.allowed_units?.[0]?.name,
                    type: input.type,
                  })),
                })
              }
              style={{ padding: 0 }}
            >
              ➕
            </button>
          </th>
          {exercise.inputs.map((input) => (
            <th key={input.id} style={{ fontSize: "0.5em" }}>
              {input.display_name}{" "}
              <small>
                {input.allowed_units && input.allowed_units.length > 1 ? (
                  <>
                    (
                    <select
                      value={sets[0]?.inputs[input.id]?.unit}
                      style={{ flex: 1 }}
                      onChange={(event) => {
                        const unit = event.target.value as Unit;
                        sets.forEach((set, setIndex) => {
                          update(setIndex, {
                            ...set,
                            inputs: set.inputs.map((input) => ({
                              ...input,
                              unit,
                            })),
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
                    )
                  </>
                ) : input.metric_unit?.toLowerCase() !==
                    input.display_name.toLowerCase() &&
                  input.type !== InputType.Options &&
                  input.type !== InputType.Grade ? (
                  <>
                    (
                    <span style={{ width: "auto", flex: 1 }}>
                      {input.metric_unit}
                    </span>
                    )
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
              <div style={{ display: "flex" }}>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  style={{ padding: 0 }}
                >
                  ❌
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newIndex = index - 1;
                    const destination = sets[newIndex]!;
                    const source = sets[index]!;
                    update(index, destination);
                    update(newIndex, source);
                  }}
                  disabled={index === 0}
                  style={{ padding: 0 }}
                >
                  ⬆️
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newIndex = index + 1;
                    const destination = sets[newIndex]!;
                    const source = sets[index]!;
                    update(index, destination);
                    update(newIndex, source);
                  }}
                  disabled={index === sets.length - 1}
                  style={{ padding: 0 }}
                >
                  ⬇️
                </button>
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
      <div style={{ display: "flex" }}>
        {input.type === InputType.Options && input.options ? (
          <select
            {...register(
              `exercises.${parentIndex}.sets.${setIndex}.inputs.${input.id}.value`
            )}
            style={{ flex: 1 }}
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
              `exercises.${parentIndex}.sets.${setIndex}.inputs.${input.id}.assist_type`
            )}
            style={{ flex: 1 }}
          >
            {input.hidden_by_default ? <option value={""}>---</option> : null}
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
                `exercises.${parentIndex}.sets.${setIndex}.inputs.${input.id}.value`
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
                `exercises.${parentIndex}.sets.${setIndex}.inputs.${input.id}.value`
              )}
              type="number"
              onFocus={(e) => e.target.select()}
              step={input.metric_unit === Unit.Reps ? "1" : "0.01"}
              style={{ width: "64px", flex: 1, textAlign: "right" }}
            />
          )
        ) : null}
      </div>
    </td>
  ));
}
