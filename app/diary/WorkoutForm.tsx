/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { TZDate } from "@date-fns/tz";
import { compareDesc, formatDistanceToNowStrict, isValid } from "date-fns";
import { Route } from "next";
import type { Session } from "next-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useId, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import Select, { components, OnChangeValue } from "react-select";
import Creatable from "react-select/creatable";
import { FieldSetX } from "../../components/FieldSet";
import { StealthButton } from "../../components/StealthButton";
import { frenchRounded } from "../../grades";
import { useEvent } from "../../hooks";
import useInterval from "../../hooks/useInterval";
import {
  exercises,
  exercisesById,
  InputType,
  Unit,
  type ExerciseData,
} from "../../models/exercises";
import {
  isNextSetDue,
  WorkoutSource,
  type WorkoutData,
  type WorkoutExercise,
  type WorkoutExerciseSet,
  type WorkoutExerciseSetInput,
} from "../../models/workout";
import type {
  getNextSets,
  IWorkoutExercisesView,
  IWorkoutLocationsView,
} from "../../models/workout.server";
import { dateToString, DEFAULT_TIMEZONE, isNonEmptyArray } from "../../utils";
import { deleteWorkout, upsertWorkout } from "./actions";
import { NextSets } from "./NextSets";
import { WorkoutEntryExerciseSetRow } from "./WorkoutEntry";

/**
 * Create a date YYYY-MM-DD date string that is typecasted as a `Date`.
 * Hack when using `defaultValues` in `react-hook-form`
 * This is because `react-hook-form` doesn't support `defaultValue` of type `Date` even if the types say so
 */
function dateToInputDate(date?: Date) {
  if (!date || !isValid(date)) return undefined;

  return date.toJSON().slice(0, 10) as unknown as Date;
}

const setValueAs = (v: unknown) =>
  v === "" || Number.isNaN(Number(v)) ? null : Number(v);
const getValueAs = (v: unknown) =>
  v === null || Number.isNaN(Number(v)) ? "" : Number(v);
const getValueAsFont = (v: unknown) =>
  v === null || Number.isNaN(Number(v)) || v === 0 ? "" : Number(v);

interface WorkoutDataFormData extends Omit<WorkoutData, "exercises"> {
  _id?: string;
  exercises: (Omit<WorkoutExercise, "sets"> & {
    sets: (Omit<WorkoutExerciseSet, "inputs"> & {
      inputs: (Omit<WorkoutExerciseSetInput, "value"> & {
        value: number | string;
      })[];
    })[];
  })[];
}

export function WorkoutForm<R extends string>({
  user,
  workout,
  date,
  dismissTo,
  locations,
  exercisesStats,
  nextSets,
}: {
  user: Session["user"];
  workout?: WorkoutData & { _id?: string };
  date: `${number}-${number}-${number}`;
  dismissTo: Route<R>;
  locations: IWorkoutLocationsView[];
  exercisesStats: IWorkoutExercisesView[];
  nextSets?: Awaited<ReturnType<typeof getNextSets>>;
}) {
  const router = useRouter();
  const tzDate = new TZDate(date, user.timeZone || DEFAULT_TIMEZONE);

  const {
    handleSubmit,
    register,
    reset,
    control,
    watch,
    getValues,
    formState: { isDirty, isSubmitting },
  } = useForm<WorkoutDataFormData>({
    defaultValues: workout
      ? {
          ...workout,
          workedOutAt: dateToInputDate(workout?.workedOutAt),
          exercises: workout.exercises.map((exercise) => ({
            ...exercise,
            sets: exercise.sets.map((set) => ({
              ...set,
              inputs: set.inputs.map((input) => ({
                ...input,
                value:
                  input.unit === Unit.FrenchRounded
                    ? getValueAsFont(input.value)
                    : getValueAs(input.value),
              })),
            })),
          })),
        }
      : undefined,
  });
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: "exercises",
  });

  const dueSets = nextSets
    ?.filter((nextSet) => isNextSetDue(tzDate, nextSet))
    .filter(
      (nextSet) =>
        !watch("exercises")?.some(
          (exerciseValue) => exerciseValue.exerciseId === nextSet.exerciseId,
        ),
    );

  const futureSets = nextSets
    ?.filter((nextSet) => !isNextSetDue(tzDate, nextSet))
    .filter(
      (nextSet) =>
        !watch("exercises")?.some(
          (exerciseValue) => exerciseValue.exerciseId === nextSet.exerciseId,
        ),
    );

  const handleAddExercise = useEvent((exerciseId: number) => {
    if (!dueSets) return;

    const exerciseDefinition = exercisesById[exerciseId]!;

    const weightInputIndex = exerciseDefinition.inputs.findIndex(
      ({ type }) =>
        type === InputType.Weight || type === InputType.Weightassist,
    );

    const goalWeight = dueSets.find(
      (nextSet) => nextSet.exerciseId === exerciseId,
    )?.nextWorkingSetInputs[weightInputIndex]?.value;
    const warmupIncrement = ((goalWeight ?? NaN) - 20) / 10 >= 2 ? 20 : 10;

    const setWeights: number[] = [goalWeight ?? NaN];
    while (setWeights[setWeights.length - 1]! > 20 + warmupIncrement) {
      setWeights.push(setWeights[setWeights.length - 1]! - warmupIncrement);
    }

    const sets = setWeights.reverse().map(
      (setWeight): WorkoutExerciseSet => ({
        createdAt: new Date(),
        updatedAt: new Date(),
        inputs: exerciseDefinition.inputs.map(
          (input): WorkoutExerciseSetInput => ({
            value: input.type === InputType.Weight ? setWeight : NaN,
            unit: input.metric_unit,
          }),
        ),
      }),
    );

    append({ exerciseId, sets });
  });

  const locationInstanceId = useId();

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
          const newWorkout: Omit<WorkoutData, "id"> & {
            _id?: string;
            id?: string;
          } = {
            _id: workout?._id,
            id: workout?.id,
            userId: user.id,
            // Shit that will change
            workedOutAt: data.workedOutAt ?? workout?.workedOutAt,
            createdAt: workout?.createdAt ?? new Date(),
            updatedAt: new Date(),
            exercises:
              data.exercises?.map((exercise) => ({
                ...exercise,
                sets: exercise.sets.map((set) => ({
                  ...set,
                  inputs: set.inputs.map((input) => ({
                    ...input,
                    value: setValueAs(input.value) as number,
                  })),
                })),
              })) ?? workout?.exercises,
            source: WorkoutSource.Self,
            location: data.location ?? workout?.location,
          };
          console.log({ workout, data, newWorkout });
          const newWorkoutId = await upsertWorkout(newWorkout);

          if (!workout) router.push(`/diary/${date}/workout/${newWorkoutId}`);

          // Wait forever, presuming this component unmounts when the above push completes. (LET ME AWAIT THIS NEXT.JS???)
          await new Promise(() => {});

          return;
          reset(
            workout
              ? {
                  ...workout,
                  workedOutAt: dateToInputDate(workout?.workedOutAt),
                }
              : { exercises: [] },
          );
        })}
        className="flex min-w-[50%] flex-1 flex-col gap-1"
      >
        <div className="inset-x sticky -top-4 z-20 -mt-4 flex items-center justify-evenly border-b-[1px] bg-white pt-2 pb-2">
          <button type="button" onClick={() => router.push(dismissTo)}>
            ❌
          </button>
          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className={
              "rounded-xl bg-[#ff0] px-3 py-1 text-lg leading-none font-semibold disabled:bg-gray-200 disabled:opacity-50"
            }
          >
            {workout ? "Update" : "Create"}
          </button>
          {workout?._id ? (
            <button
              disabled={isSubmitting}
              type="button"
              onClick={async () => {
                if (window.confirm("Are you sure you want to delete this?")) {
                  await deleteWorkout(workout._id!);
                  router.push(dismissTo);
                  return;
                }
              }}
            >
              🚮
            </button>
          ) : (
            <div />
          )}
        </div>
        <div className="flex">
          <Controller
            name="location"
            control={control}
            render={({ field }) => (
              <Creatable<{ label: string; value: string }, false>
                className="flex-1"
                instanceId={locationInstanceId}
                placeholder="Pick location..."
                isDisabled={isSubmitting}
                isMulti={false}
                isClearable={true}
                components={{
                  Input: (props) => (
                    <components.Input
                      {...props}
                      aria-activedescendant={undefined}
                    />
                  ),
                }}
                options={locations
                  .sort((a, b) =>
                    compareDesc(a.mostRecentVisit ?? 0, b.mostRecentVisit ?? 0),
                  )
                  .map(({ location, visitCount }) => ({
                    label: `${location} (${visitCount})`,
                    value: location,
                  }))}
                {...field}
                value={
                  field.value
                    ? { label: field.value, value: field.value }
                    : null
                }
                onChange={(
                  selected: OnChangeValue<
                    { label: string; value: string },
                    false
                  >,
                ) => {
                  field.onChange(selected?.value || null);
                }}
              />
            )}
          />
          <input
            type="date"
            {...register("workedOutAt", { valueAsDate: true })}
            defaultValue={String(
              dateToInputDate(workout?.workedOutAt ?? tzDate),
            )}
            hidden={!workout}
            className="border-b-2 border-gray-200 focus:border-gray-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          {fields.map((field, index) => {
            const exercise = exercisesById[field.exerciseId];
            if (!exercise) {
              throw new Error(`Exercise with ID ${field.exerciseId} not found`);
            }
            const nextExerciseSet = nextSets?.find(
              (nextSet) => nextSet.exerciseId === exercise.id,
            );
            return (
              <FieldSetX
                key={field.id}
                className="flex flex-col"
                legend={
                  <div className="-ml-2 flex flex-1 gap-1 text-sm font-semibold">
                    <Link
                      prefetch={false}
                      href={`/diary/exercises/${exercise.id}`}
                      style={{ color: "#edab00" }}
                    >
                      {exercise.name}
                    </Link>
                    <StealthButton
                      onClick={() => remove(index)}
                      disabled={isSubmitting}
                      className="leading-0"
                    >
                      ❌
                    </StealthButton>
                    {field.comment !== undefined ? (
                      <StealthButton
                        onClick={() =>
                          update(index, { ...field, comment: undefined })
                        }
                        className="mx-0.5"
                      >
                        ✍️
                      </StealthButton>
                    ) : (
                      <StealthButton
                        onClick={() => update(index, { ...field, comment: "" })}
                        className="mx-0.5"
                      >
                        ✍️
                      </StealthButton>
                    )}
                  </div>
                }
              >
                {nextExerciseSet && nextExerciseSet.nextWorkingSets ? (
                  <div className="leading-none">
                    <span className="text-sm">
                      Goal{" "}
                      <table className="inline-table w-auto max-w-0">
                        <tbody>
                          <WorkoutEntryExerciseSetRow
                            exercise={exercise}
                            set={{
                              inputs:
                                nextExerciseSet.nextWorkingSetInputs || [],
                            }}
                            repeatCount={nextExerciseSet.nextWorkingSets}
                          />
                        </tbody>
                      </table>
                    </span>
                    {nextExerciseSet.workedOutAt ? (
                      <span className="text-xs">
                        {" "}
                        based on{" "}
                        <Link
                          prefetch={false}
                          href={`/diary/${dateToString(nextExerciseSet.workedOutAt)}`}
                          style={{ color: "#edab00" }}
                        >
                          last set{" "}
                          {nextExerciseSet.workedOutAt.toLocaleDateString(
                            "da-DK",
                          )}
                        </Link>
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {field.comment !== undefined ? (
                  <textarea
                    {...register(`exercises.${index}.comment`)}
                    className="w-full border-b-2 border-gray-200 text-xs focus:border-gray-500"
                  />
                ) : null}
                <SetsForm
                  control={control}
                  register={register}
                  getValues={getValues}
                  parentIndex={index}
                  exercise={exercise}
                  isDisabled={isSubmitting}
                />
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
            placeholder="Add exercise..."
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

              append({ exerciseId: selected.value, sets: [] });
            }}
          />
        </div>
      </form>
      <div className="min-w-[50%]">
        {isNonEmptyArray(dueSets) ? (
          <div>
            <b>Due Sets:</b>
            <NextSets
              user={user}
              date={date}
              nextSets={dueSets}
              onAddExercise={handleAddExercise}
            />
          </div>
        ) : null}
        {isNonEmptyArray(futureSets) ? (
          <div>
            <small>
              <b>Future Sets:</b>
              <NextSets
                user={user}
                date={date}
                nextSets={futureSets}
                onAddExercise={handleAddExercise}
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
  getValues,
  parentIndex,
  register,
  exercise,
  isDisabled = false,
}: {
  control: ReturnType<typeof useForm<WorkoutDataFormData>>["control"];
  register: ReturnType<typeof useForm<WorkoutDataFormData>>["register"];
  getValues: ReturnType<typeof useForm<WorkoutDataFormData>>["getValues"];
  parentIndex: number;
  exercise: ExerciseData;
  isDisabled?: boolean;
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

  const watchedSets = useWatch({
    control,
    name: `exercises.${parentIndex}.sets`,
  });

  const lastSet = watchedSets[watchedSets.length - 1];

  return (
    <table className="w-full max-w-xs min-w-1/2 border-collapse border-spacing-0">
      <thead>
        <tr>
          <th>
            <StealthButton
              disabled={isDisabled}
              onClick={() =>
                append({
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  inputs: exercise.inputs.map((input, inputIndex) => {
                    const lastSetInput =
                      sets[sets.length - 1]?.inputs[inputIndex];

                    return {
                      value: lastSetInput?.value ?? input.default_value ?? 0,
                      assistType: lastSetInput?.assistType,
                      unit:
                        lastSetInput?.unit ??
                        input.metric_unit ??
                        input.allowed_units?.[0]?.name,
                    };
                  }),
                })
              }
              className="leading-0"
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
                    disabled={isDisabled}
                    value={sets[0]?.inputs[inputIndex]?.unit}
                    className="flex-1 [font-size:inherit]"
                    onChange={(event) => {
                      const unit = event.target.value as Unit;
                      sets.forEach((set, setIndex) => {
                        update(setIndex, {
                          ...set,
                          updatedAt: new Date(),
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
                      .sort(
                        (a, b) =>
                          (a.name === input.metric_unit ? -1 : 1) -
                          (b.name === input.metric_unit ? -1 : 1),
                      )
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
          <Fragment key={set.id}>
            <tr>
              <td className="pr-0.5 text-sm">{index + 1}.</td>
              <InputsForm
                control={control}
                register={register}
                parentIndex={parentIndex}
                setIndex={index}
                exercise={exercise}
                isDisabled={isDisabled}
              />
              <td>
                <StealthButton
                  disabled={isDisabled}
                  onClick={() => remove(index)}
                  className="mx-0.5 leading-0"
                >
                  ❌
                </StealthButton>
              </td>
              <td>
                {set.comment !== undefined ? (
                  <StealthButton
                    disabled={isDisabled}
                    onClick={() => {
                      const setState = getValues(
                        `exercises.${parentIndex}.sets.${index}`,
                      );

                      update(index, { ...setState, comment: undefined });
                    }}
                    className="mx-0.5"
                  >
                    ✍️
                  </StealthButton>
                ) : (
                  <StealthButton
                    disabled={isDisabled}
                    onClick={() => {
                      const setState = getValues(
                        `exercises.${parentIndex}.sets.${index}`,
                      );
                      update(index, { ...setState, comment: "" });
                    }}
                    className="mx-0.5"
                  >
                    ✍️
                  </StealthButton>
                )}
              </td>
              <td>
                <StealthButton
                  disabled={isDisabled}
                  onClick={() => {
                    const setState = getValues(
                      `exercises.${parentIndex}.sets.${index}`,
                    );

                    append({
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      inputs: exercise.inputs.map((input, inputIndex) => {
                        const setInput = setState.inputs[inputIndex];

                        return {
                          value: setInput?.value ?? input.default_value ?? NaN,
                          assistType: setInput?.assistType,
                          unit:
                            setInput?.unit ??
                            input.metric_unit ??
                            input.allowed_units?.[0]?.name,
                        };
                      }),
                      comment: setState.comment ?? undefined,
                    });
                  }}
                  className="mx-0.5 leading-0"
                >
                  ➕
                </StealthButton>
              </td>
            </tr>
            {set.comment !== undefined ? (
              <tr>
                <td colSpan={exercise.inputs.length + 4}>
                  <textarea
                    disabled={isDisabled}
                    {...register(
                      `exercises.${parentIndex}.sets.${index}.comment`,
                    )}
                    className="w-full border-b-2 border-gray-200 text-xs focus:border-gray-500"
                  />
                </td>
              </tr>
            ) : null}
          </Fragment>
        ))}
      </tbody>
      {lastSet?.updatedAt ? (
        <tfoot>
          <tr>
            <td colSpan={exercise.inputs.length + 4}>
              <TimeSince date={lastSet.updatedAt} />
            </td>
          </tr>
        </tfoot>
      ) : null}
    </table>
  );
}

function TimeSince({ date }: { date: Date }) {
  const [, setState] = useState({});

  useInterval(() => {
    setState({});
  }, 1000);

  return (
    <small>
      Last updated{" "}
      <span className="tabular-nums">
        {formatDistanceToNowStrict(date, {
          addSuffix: true,
        })}
      </span>
    </small>
  );
}

function InputsForm({
  parentIndex,
  setIndex,
  control,
  register,
  exercise,
  isDisabled = false,
}: {
  control: ReturnType<typeof useForm<WorkoutDataFormData>>["control"];
  register: ReturnType<typeof useForm<WorkoutDataFormData>>["register"];
  parentIndex: number;
  setIndex: number;
  exercise: ExerciseData;
  isDisabled?: boolean;
}) {
  const { fields: sets, update } = useFieldArray({
    control,
    name: `exercises.${parentIndex}.sets`,
  });
  const updateSet = () =>
    update(setIndex, { ...sets[setIndex]!, updatedAt: new Date() });
  const onChange = useEvent(() => updateSet());

  return exercise.inputs.map((input, index) => (
    <td key={index}>
      <div className="flex">
        {input.type === InputType.Options && input.options ? (
          <select
            disabled={isDisabled}
            {...register(
              `exercises.${parentIndex}.sets.${setIndex}.inputs.${index}.value`,
              { onChange },
            )}
            className="flex-1"
          >
            {input.hidden_by_default ? <option value="">---</option> : null}
            {input.options.map((option, i) => (
              <option key={option.value} value={i}>
                {option.value}
              </option>
            ))}
          </select>
        ) : null}
        {input.type === InputType.Weightassist && input.options ? (
          <select
            disabled={isDisabled}
            {...register(
              `exercises.${parentIndex}.sets.${setIndex}.inputs.${index}.assistType`,
              {
                setValueAs: (v) => (typeof v === "string" && v ? v : undefined),
                onChange,
              },
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
              disabled={isDisabled}
              {...register(
                `exercises.${parentIndex}.sets.${setIndex}.inputs.${index}.value`,
                { onChange },
              )}
            >
              {input.hidden_by_default ? <option value="">---</option> : null}
              {frenchRounded.data.map(({ value, name }) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <input
              disabled={isDisabled}
              {...register(
                `exercises.${parentIndex}.sets.${setIndex}.inputs.${index}.value`,
                { onChange },
              )}
              type="number"
              onFocus={(e) => e.target.select()}
              step={input.metric_unit === Unit.Reps ? "1" : "0.01"}
              style={{ width: "48px", flex: 1, textAlign: "right" }}
              className="border-b-2 border-gray-200 text-lg leading-none focus:border-gray-500"
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
