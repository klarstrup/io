/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { TZDate } from "@date-fns/tz";
import {
  addMilliseconds,
  compareAsc,
  compareDesc,
  formatDistanceToNowStrict,
  isPast,
  isValid,
} from "date-fns";
import { Route } from "next";
import type { Session } from "next-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useId, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import Select, { components, OnChangeValue } from "react-select";
import Creatable from "react-select/creatable";
import { FieldSetX } from "../../components/FieldSet";
import ProblemByProblem, {
  exerciseSetsToProblemByProblem,
} from "../../components/ProblemByProblem";
import { StealthButton } from "../../components/StealthButton";
import { frenchRounded } from "../../grades";
import { useEvent } from "../../hooks";
import useInterval from "../../hooks/useInterval";
import {
  exercises,
  exercisesById,
  InputType,
  SendType,
  Unit,
  type ExerciseData,
} from "../../models/exercises";
import type { LocationData } from "../../models/location";
import {
  durationToMs,
  getCircuitByLocationAndSetColor,
  isClimbingExercise,
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
import { WorkoutEntryExerciseSetRow } from "./WorkoutEntryExerciseSetRow";

const colorNameToEmoji = (colorName: string): string =>
  colorName === "mint"
    ? "🩵"
    : colorName === "yellow"
      ? "💛"
      : colorName === "green"
        ? "💚"
        : colorName === "red"
          ? "❤️"
          : colorName === "purple"
            ? "💜"
            : colorName === "orange"
              ? "🧡"
              : colorName === "white"
                ? "🤍"
                : colorName === "pink"
                  ? "🩷"
                  : colorName === "blue"
                    ? "💙"
                    : colorName === "black"
                      ? "🖤"
                      : colorName;

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

interface WorkoutDataFormData
  extends Omit<WorkoutData, "exercises" | "locationId"> {
  _id?: string;
  locationId?: string;
  exercises: (Omit<WorkoutExercise, "sets"> & {
    sets: (Omit<WorkoutExerciseSet, "inputs"> & {
      meta?: Record<string, unknown>;
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
  user?: Session["user"];
  workout?: WorkoutData & { _id?: string };
  date: `${number}-${number}-${number}`;
  dismissTo: Route<R>;
  locations?: (Omit<IWorkoutLocationsView, "location"> & {
    location: LocationData & { _id: string };
  })[];
  exercisesStats?: IWorkoutExercisesView[];
  nextSets?: Awaited<ReturnType<typeof getNextSets>>;
}) {
  const router = useRouter();
  const tzDate = useMemo(
    () => new TZDate(date, user?.timeZone || DEFAULT_TIMEZONE),
    [date, user?.timeZone],
  );

  const {
    handleSubmit,
    register,
    reset,
    control,
    watch,
    getValues,
    setValue,
    formState: { isDirty, isSubmitting },
  } = useForm<WorkoutDataFormData>({
    mode: "onChange",
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

  const dueSets = useMemo(
    () =>
      nextSets
        ?.filter((nextSet) => isNextSetDue(tzDate, nextSet))
        .filter(
          (nextSet) =>
            !watch("exercises")?.some(
              (exerciseValue) =>
                exerciseValue.exerciseId === nextSet.exerciseId,
            ),
        ),
    [nextSets, tzDate, watch],
  );

  const futureSets = useMemo(
    () =>
      nextSets
        ?.filter((nextSet) => !isNextSetDue(tzDate, nextSet))
        .filter(
          (nextSet) =>
            !watch("exercises")?.some(
              (exerciseValue) =>
                exerciseValue.exerciseId === nextSet.exerciseId,
            ),
        )
        .sort((a, b) =>
          compareAsc(
            addMilliseconds(
              a.workedOutAt!,
              durationToMs(a.scheduleEntry.frequency),
            ),
            addMilliseconds(
              b.workedOutAt!,
              durationToMs(b.scheduleEntry.frequency),
            ),
          ),
        ),
    [nextSets, tzDate, watch],
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
    )?.nextWorkingSetInputs?.[weightInputIndex]?.value;
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

  const location = locations?.find(
    (location) => watch("locationId") === location.location._id,
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
          if (!user) return;

          const newWorkout: Omit<WorkoutData, "id"> & {
            _id?: string;
            id?: string;
          } = {
            _id: workout?._id,
            id: workout?.id,
            userId: user.id,
            // Shit that will change
            workedOutAt: data.workedOutAt,
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
            locationId: data.locationId,
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
        <div className="inset-x sticky -top-4 z-20 -mt-2 flex items-center justify-evenly border-b-[1px] bg-white pt-2 pb-2">
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
        <div>
          <Controller
            name="locationId"
            control={control}
            render={({ field }) => (
              <Creatable<{ label: string; value: string }, false>
                className="text-2xl"
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
                  ?.sort((a, b) =>
                    compareDesc(a.mostRecentVisit ?? 0, b.mostRecentVisit ?? 0),
                  )
                  .map(({ location, visitCount }) => ({
                    label: `${location.name} (${visitCount})`,
                    value: location._id,
                  }))}
                {...field}
                value={
                  field.value
                    ? {
                        label:
                          locations?.find((l) => l.location._id === field.value)
                            ?.location.name ?? field.value,
                        value: field.value,
                      }
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
          <center>
            <input
              type="date"
              {...register("workedOutAt", { valueAsDate: true })}
              defaultValue={String(
                dateToInputDate(workout?.workedOutAt ?? tzDate),
              )}
              hidden={!workout}
              className="border-b-2 border-gray-200 text-center text-xl focus:border-gray-500"
            />
          </center>
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
                  setValue={setValue}
                  getValues={getValues}
                  parentIndex={index}
                  exercise={exercise}
                  isDisabled={isSubmitting}
                  location={location?.location}
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
            className="text-2xl"
            options={exercises
              .map((exercise) => ({
                ...exercise,
                stats: exercisesStats?.find(
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
                showDueDate
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
  setValue,
  parentIndex,
  register,
  exercise,
  isDisabled = false,
  location,
}: {
  control: ReturnType<typeof useForm<WorkoutDataFormData>>["control"];
  register: ReturnType<typeof useForm<WorkoutDataFormData>>["register"];
  getValues: ReturnType<typeof useForm<WorkoutDataFormData>>["getValues"];
  setValue: ReturnType<typeof useForm<WorkoutDataFormData>>["setValue"];
  parentIndex: number;
  exercise: ExerciseData;
  isDisabled?: boolean;
  location?: LocationData & { _id: string };
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

  const boulderCircuits =
    exercise.id === 2001
      ? location?.boulderCircuits
          ?.filter((c) => !c.deletedAt || !isPast(c.deletedAt))
          .sort((a, b) =>
            a.gradeEstimate && b.gradeEstimate
              ? a.gradeEstimate - b.gradeEstimate
              : a.name.localeCompare(b.name),
          )
      : undefined;

  const showAttemptsInput =
    isClimbingExercise(exercise.id) &&
    watchedSets.some(
      (set) =>
        (set.meta &&
          "attemptCount" in set.meta &&
          set.meta?.attemptCount &&
          Number(set.meta.attemptCount) >= 0) ||
        Number(set.inputs[2]?.value) === Number(SendType.Attempt) ||
        Number(set.inputs[2]?.value) === Number(SendType.Top) ||
        Number(set.inputs[2]?.value) === Number(SendType.Zone),
    );

  return (
    <table className="w-full max-w-md min-w-1/2 border-collapse border-spacing-0">
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
          {boulderCircuits?.length ? (
            <th style={{ fontSize: "0.5em" }}>Circuit</th>
          ) : null}
          {exercise.inputs.map((input, inputIndex) =>
            boulderCircuits?.length &&
            (input.type === InputType.Grade ||
              (input.display_name === "Hold Color" &&
                boulderCircuits?.every((c) => c.holdColor))) ? null : (
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
                      (
                      <span className="w-auto flex-1">{input.metric_unit}</span>
                      )
                    </>
                  ) : null}
                </small>
              </th>
            ),
          )}
          {showAttemptsInput ? (
            <th style={{ fontSize: "0.5em" }}>Attempts</th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {sets.map((set, index) => (
          <Fragment key={set.id}>
            <tr className={index % 2 ? "bg-gray-200" : "bg-white"}>
              <td className="pr-0.5 text-xs" width="1%">
                {isClimbingExercise(exercise.id) && watchedSets[index] ? (
                  <ProblemByProblem
                    problemByProblem={exerciseSetsToProblemByProblem(location, [
                      watchedSets[index] as WorkoutExerciseSet,
                    ])}
                  />
                ) : (
                  `${index + 1}.`
                )}
              </td>
              {boulderCircuits?.length ? (
                <td>
                  <select
                    disabled={isDisabled}
                    {...register(
                      `exercises.${parentIndex}.sets.${index}.meta.boulderCircuitId`,
                      {
                        setValueAs: (v) =>
                          typeof v === "string" && v ? v : undefined,
                      },
                    )}
                    className="w-full text-2xl min-w-10"
                  >
                    <option value="">
                      ---{" "}
                      {location &&
                      getCircuitByLocationAndSetColor(
                        exercise,
                        watchedSets[index]!,
                        location,
                      )
                        ? `("${
                            getCircuitByLocationAndSetColor(
                              exercise,
                              watchedSets[index]!,
                              location,
                            )?.name
                          }" assumed)`
                        : null}
                    </option>
                    {boulderCircuits.map((c) => (
                      <option value={c.id} key={c.id}>
                        {boulderCircuits.every((bC) => bC.holdColor)
                          ? colorNameToEmoji(c.holdColor!)
                          : c.name}{" "}
                        {/*c.gradeEstimate
                          ? `(${new Grade(c.gradeEstimate).toString()})`
                          : null*/}
                      </option>
                    ))}
                  </select>
                </td>
              ) : null}
              <InputsForm
                register={register}
                getValues={getValues}
                setValue={setValue}
                parentIndex={parentIndex}
                setIndex={index}
                exercise={exercise}
                isDisabled={isDisabled}
                boulderCircuits={boulderCircuits}
              />
              <td className={"pl-1"}>
                {showAttemptsInput ? (
                  <input
                    disabled={
                      isDisabled ||
                      Number(watchedSets[index]?.inputs[2]?.value ?? -1) ===
                        Number(SendType.Flash)
                    }
                    {...register(
                      `exercises.${parentIndex}.sets.${index}.meta.attemptCount`,
                      {
                        setValueAs: (v) =>
                          v === "" || Number.isNaN(Number(v))
                            ? undefined
                            : Number(v),
                        onChange: () => {
                          const setKey =
                            `exercises.${parentIndex}.sets.${index}` as const;
                          const setState = getValues(setKey);

                          if (setState.meta?.attemptCount === 1) {
                            const newInputs = [...setState.inputs];
                            newInputs[2] = {
                              ...newInputs[2],
                              value: SendType.Flash,
                            };
                            setValue(setKey, {
                              ...setState,
                              inputs: newInputs,
                              updatedAt: new Date(),
                            });
                          } else if (
                            setState.meta?.attemptCount &&
                            Number(setState.meta.attemptCount) >= 1 &&
                            setState.inputs[2]?.value === SendType.Flash
                          ) {
                            const newInputs = [...setState.inputs];
                            newInputs[2] = {
                              ...newInputs[2],
                              value: SendType.Attempt,
                            };
                            setValue(setKey, {
                              ...setState,
                              inputs: newInputs,
                              updatedAt: new Date(),
                            });
                          } else {
                            setValue(
                              setKey,
                              { ...setState, updatedAt: new Date() },
                              { shouldDirty: true },
                            );
                          }
                        },
                      },
                    )}
                    type="number"
                    onFocus={(e) => e.target.select()}
                    className="w-12 border-b-2 border-gray-200 text-right text-2xl leading-none focus:border-gray-500"
                  />
                ) : null}
              </td>
              <td width="1%">
                <StealthButton
                  disabled={isDisabled}
                  onClick={() => remove(index)}
                  className="mx-1 leading-0"
                >
                  ❌
                </StealthButton>
              </td>
              <td width="1%">
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
              <td width="1%">
                <StealthButton
                  disabled={isDisabled}
                  onClick={() => {
                    const setState = getValues(
                      `exercises.${parentIndex}.sets.${index}`,
                    );

                    append({
                      ...setState,
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
                    });
                  }}
                  className="mx-0.5 leading-0"
                >
                  ➕
                </StealthButton>
              </td>
            </tr>
            {set.comment !== undefined ? (
              <tr className={index % 2 ? "bg-gray-200" : "bg-white"}>
                <td
                  colSpan={
                    exercise.inputs.length +
                    4 +
                    (boulderCircuits?.length ? 1 : 0)
                  }
                >
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
    <small className="italic">
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
  register,
  getValues,
  setValue,
  exercise,
  isDisabled = false,
  boulderCircuits,
}: {
  register: ReturnType<typeof useForm<WorkoutDataFormData>>["register"];
  getValues: ReturnType<typeof useForm<WorkoutDataFormData>>["getValues"];
  setValue: ReturnType<typeof useForm<WorkoutDataFormData>>["setValue"];
  parentIndex: number;
  setIndex: number;
  exercise: ExerciseData;
  isDisabled?: boolean;
  boulderCircuits?: LocationData["boulderCircuits"];
}) {
  const updateSet = () => {
    const setKey = `exercises.${parentIndex}.sets.${setIndex}` as const;

    setValue(setKey, {
      ...getValues(setKey),
      updatedAt: new Date(),
    });
  };
  const onChange = useEvent(() => updateSet());

  return exercise.inputs.map((input, index) =>
    boulderCircuits?.length &&
    (input.type === InputType.Grade ||
      (input.display_name === "Hold Color" &&
        boulderCircuits?.every((c) => c.holdColor))) ? null : (
      <td key={index} className={index ? "pl-1" : "pr-0"}>
        {input.type === InputType.Options && input.options ? (
          <select
            disabled={isDisabled}
            {...register(
              `exercises.${parentIndex}.sets.${setIndex}.inputs.${index}.value`,
              {
                onChange: () => {
                  if (exercise.id === 2001 && index === 2) {
                    const setKey =
                      `exercises.${parentIndex}.sets.${setIndex}` as const;
                    const setState = getValues(setKey);
                    const sendType = Number(
                      setState.inputs[2]?.value ?? -1,
                    ) as SendType;

                    if (sendType === SendType.Flash) {
                      setValue(setKey, {
                        ...setState,
                        meta: { ...setState.meta, attemptCount: 1 },
                      });
                    } else if (sendType === SendType.Top) {
                      if (
                        !setState.meta?.attemptCount ||
                        Number(setState.meta.attemptCount) <= 1
                      ) {
                        setValue(setKey, {
                          ...setState,
                          meta: { ...setState.meta, attemptCount: 2 },
                        });
                      }
                    }
                  }
                  onChange();
                },
              },
            )}
            className="w-full text-2xl"
          >
            {input.hidden_by_default ? <option value="">---</option> : null}
            {input.options.map((option, i) => (
              <option key={option.value} value={i}>
                {input.display_name === "Hold Color"
                  ? colorNameToEmoji(option.value)
                  : option.value}
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
            className={
              input.type === InputType.Weightassist
                ? "w-3/5 text-2xl"
                : "w-full text-2xl"
            }
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
              className="w-full text-2xl"
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
              className={
                "border-b-2 border-gray-200 text-right text-2xl leading-none focus:border-gray-500 " +
                (input.type === InputType.Weightassist ? "w-2/5" : "w-full")
              }
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
      </td>
    ),
  );
}
