/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { Session } from "next-auth";
import { useFieldArray, useForm } from "react-hook-form";
import Select from "react-select";
import { type ExerciseData, exercises } from "../../models/exercises";
import { type WorkoutData } from "../../models/workout";
import { deleteWorkout, upsertWorkout } from "./actions";

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
      <input
        type="date"
        {...register("worked_out_at", { valueAsDate: true })}
        defaultValue={
          workout
            ? String(dateToInputDate(workout?.worked_out_at))
            : String(dateToInputDate(new Date()))
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
              {exercise.name}
              <SetsForm
                control={control}
                register={register}
                parentIndex={index}
                exercise={exercise}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={isSubmitting}
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
              >
                ⬇️
              </button>
            </div>
          );
        })}
        <label>
          Add Exercise
          <Select
            isDisabled={isSubmitting}
            options={exercises
              .filter(
                ({ id }) => !fields.some((field) => field.exercise_id === id)
              )
              .map(({ id, name, aliases }) => ({
                label: `${name} (${aliases.join(", ")})`,
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
        </label>
      </div>
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
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: `exercises.${parentIndex}.sets`,
  });
  return (
    <div>
      <ol>
        {fields.map((field, index) => (
          <li key={field.id}>
            <div
              style={{
                display: "flex",
              }}
            >
              <InputsForm
                control={control}
                register={register}
                parentIndex={parentIndex}
                setIndex={index}
                exercise={exercise}
              />
              <button type="button" onClick={() => remove(index)}>
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
                disabled={index === 0}
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
                disabled={index === fields.length - 1}
              >
                ⬇️
              </button>
            </div>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() =>
              append({
                inputs: exercise.inputs.map((input) => ({
                  id: input.id,
                  input_ordinal: input.input_ordinal,
                  value:
                    fields[fields.length - 1]?.inputs[input.id]?.value ?? 0,
                  unit:
                    fields[fields.length - 1]?.inputs[input.id]?.unit ??
                    input.metric_unit ??
                    input.allowed_units?.[0]?.name,
                  type: input.type,
                })),
              })
            }
          >
            ➕
          </button>
        </li>
      </ol>
    </div>
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
    <div key={input.id} style={{ display: "flex", flex: 1 }}>
      <span style={{ width: "auto", flex: 1 }}>{input.display_name}: </span>
      {input.options && input.options.length > 1 ? (
        <select
          {...register(
            `exercises.${parentIndex}.sets.${setIndex}.inputs.${input.id}.assist_type`
          )}
          style={{ flex: 1 }}
        >
          {input.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value}
            </option>
          ))}
        </select>
      ) : null}
      <input
        {...register(
          `exercises.${parentIndex}.sets.${setIndex}.inputs.${input.id}.value`
        )}
        type="number"
        step="0.01"
        style={{ width: "64px", flex: 1, textAlign: "right" }}
      />
      {input.allowed_units && input.allowed_units.length > 1 ? (
        <select
          {...register(
            `exercises.${parentIndex}.sets.${setIndex}.inputs.${input.id}.unit`
          )}
          style={{ flex: 1 }}
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
      ) : (
        <span style={{ width: "auto", flex: 1 }}>{input.metric_unit}</span>
      )}
    </div>
  ));
}
