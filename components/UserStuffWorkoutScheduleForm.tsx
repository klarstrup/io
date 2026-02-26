"use client";
import { useApolloClient } from "@apollo/client/react";
import {
  compareDesc,
  differenceInDays,
  isFuture,
  isValid,
  subMonths,
  subQuarters,
} from "date-fns";
import { Session } from "next-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import Select, { components, OnChangeValue } from "react-select";
import { updateUserExerciseSchedule } from "../app/diary/actions";
import { exercises, exercisesById } from "../models/exercises";
import { InputType } from "../models/exercises.types";
import { IWorkoutExercisesView } from "../models/workout.server";
import type { ExerciseSchedule } from "../sources/fitocracy";
import { epoch } from "../utils";
import { DistanceToNowStrict } from "./DistanceToNowStrict";
import { ExerciseName } from "./ExerciseName";
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

const exerciseScheduleForForm = (exerciseSchedule?: ExerciseSchedule) => ({
  ...exerciseSchedule,
  snoozedUntil:
    exerciseSchedule?.snoozedUntil && isFuture(exerciseSchedule.snoozedUntil)
      ? dateToInputDate(exerciseSchedule.snoozedUntil)
      : undefined,
});

function UserStuffWorkoutScheduleForm({
  user,
  exerciseSchedule,
  onDismiss,
}: {
  user: Session["user"];
  exerciseSchedule: ExerciseSchedule;
  onDismiss: () => void;
}) {
  const client = useApolloClient();
  const router = useRouter();
  const {
    handleSubmit,
    register,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<ExerciseSchedule>({
    defaultValues: exerciseScheduleForForm(exerciseSchedule),
  });

  const exercise = exercisesById.get(exerciseSchedule.exerciseId);
  if (!exercise) {
    throw new Error(
      `Exercise with ID ${exerciseSchedule.exerciseId} not found`,
    );
  }
  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const newSchedule = await updateUserExerciseSchedule(
          user.id,
          exerciseSchedule.id,
          data,
        );
        console.log({
          exerciseSchedule,
          data,
          newSchedule,
        });

        reset(exerciseScheduleForForm(newSchedule));
        router.refresh();
        await client.refetchQueries({ include: "all" });
        onDismiss();
      })}
    >
      <FieldSetY
        legend={
          <div className="-ml-2 flex flex-1 gap-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                reset(exerciseScheduleForForm(exerciseSchedule));
                onDismiss();
              }}
              disabled={isSubmitting}
              className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <Link
              prefetch={false}
              href={`/diary/exercises/${exercise.id}`}
              style={{ color: "#edab00" }}
            >
              <ExerciseName exerciseInfo={exercise} />
            </Link>
            <label>
              <input type="checkbox" {...register("enabled")} /> Enabled
            </label>
          </div>
        }
        className="flex flex-col gap-1"
      >
        <div className="grid grid-cols-2 gap-1 text-sm">
          <label className="flex gap-1">
            Snoozed until:
            <input
              type="date"
              {...register(`snoozedUntil`, {
                valueAsDate: true,
              })}
              className={"border-b-2 border-gray-200 focus:border-gray-500"}
            />
          </label>
          <label className="col-[span_2] flex gap-1">
            Frequency:
            <select
              {...register(`frequency.days`, {
                valueAsNumber: true,
              })}
              className="w-full"
            >
              <option value={7 / 14}>Biseptantweekly</option>
              <option value={7 / 12}>Unciweekly</option>
              <option value={7 / 8}>Octantweekly</option>
              <option value={7 / 7}>Septantweekly</option>
              <option value={7 / 6}>Sextantweekly</option>
              <option value={7 / 5}>Quinqueweekly</option>
              <option value={7 / 4}>Quadrantweekly</option>
              <option value={7 / 3}>Trientweekly</option>
              <option value={7 / 2}>Semiweekly</option>
              <option value={7 / 1.5}>Sesquiweekly</option>
              <option value={7 / 1.25}>Quasquiweekly</option>
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
              {...register(`workingSets`, {
                valueAsNumber: true,
              })}
              className="w-full"
            />
          </label>
          {exercise.inputs.some((input) => input.type === InputType.Reps) &&
          !exercise.inputs.every((input) => input.type === InputType.Reps) ? (
            <>
              <label className="flex gap-1">
                Reps:
                <input
                  type="number"
                  {...register(`workingReps`, {
                    valueAsNumber: true,
                  })}
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
                  {...register(`baseWeight`, {
                    valueAsNumber: true,
                  })}
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
                  {...register(`increment`, {
                    valueAsNumber: true,
                  })}
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
                  {...register(`deloadFactor`, {
                    valueAsNumber: true,
                  })}
                  className="w-full"
                />
              </label>
            </>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={!isDirty || isSubmitting}
          className="self-start rounded bg-blue-500 px-3 py-1 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save
        </button>
      </FieldSetY>
    </form>
  );
}

export default function UserStuffWorkoutSchedulesForm({
  user,
  exercisesStats,
}: {
  user: Session["user"];
  exercisesStats: IWorkoutExercisesView[];
}) {
  const exerciseSchedules = user.exerciseSchedules ?? [];

  const [exerciseScheduleBeingEditedId, setExerciseScheduleBeingEditedId] =
    useState<ExerciseSchedule["id"] | null>(null);

  const anySnoozed = exerciseSchedules.some(
    (schedule) => schedule.snoozedUntil && isFuture(schedule.snoozedUntil),
  );

  const selectId = useId();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: "1em",
      }}
      className="w-full max-w-full"
    >
      <div className="flex w-full max-w-full flex-col gap-1 overflow-x-scroll">
        <h1 className="text-lg font-bold">Exercise Schedules</h1>
        {exerciseScheduleBeingEditedId ? (
          <UserStuffWorkoutScheduleForm
            user={user}
            exerciseSchedule={
              exerciseSchedules.find(
                (schedule) => schedule.id === exerciseScheduleBeingEditedId,
              )!
            }
            onDismiss={() => setExerciseScheduleBeingEditedId(null)}
          />
        ) : exerciseSchedules.length > 0 ? (
          <table
            className={
              "w-full table-auto border-collapse border border-gray-200"
            }
          >
            <thead>
              <tr className={"border-b-2 border-gray-200 whitespace-nowrap"}>
                <th className="px-1 text-left text-sm font-semibold">
                  Exercise <small>(count)</small>
                </th>
                {anySnoozed ? (
                  <th className="px-1 text-left text-sm font-semibold">
                    Snoozed Until
                  </th>
                ) : null}
                <th className="px-1 text-left text-sm font-semibold">
                  Frequency
                </th>
                <th className="px-1 text-left text-sm font-semibold">Sets</th>
                <th className="px-1 text-left text-sm font-semibold">Reps</th>
                <th className="px-1 text-left text-sm font-semibold">
                  Base Effort
                </th>
                <th className="px-1 text-left text-sm font-semibold">
                  Increment
                </th>
                <th className="px-1 text-left text-sm font-semibold">Deload</th>
              </tr>
            </thead>
            <tbody>
              {[...exerciseSchedules]
                .sort((a, b) =>
                  a.enabled === b.enabled
                    ? compareDesc(
                        exercisesStats.find(
                          (stat) => stat.exerciseId === a.exerciseId,
                        )?.workedOutAt ?? epoch,
                        exercisesStats.find(
                          (stat) => stat.exerciseId === b.exerciseId,
                        )?.workedOutAt ?? epoch,
                      )
                    : a.enabled
                      ? -1
                      : 1,
                )
                .map((schedule) => {
                  const exercise = exercisesById.get(schedule.exerciseId);
                  if (!exercise) return null;

                  const stats = exercisesStats.find(
                    (stat) => stat.exerciseId === schedule.exerciseId,
                  );

                  let effortInputIndex = exercise.inputs.findIndex(
                    ({ type }) =>
                      type === InputType.Weight ||
                      type === InputType.Weightassist ||
                      type === InputType.Time,
                  );
                  if (effortInputIndex === -1) {
                    effortInputIndex = exercise.inputs.findIndex(
                      ({ type }) => type === InputType.Reps,
                    );
                  }

                  return (
                    <tr key={schedule.id}>
                      <td className={"px-1 text-left whitespace-nowrap"}>
                        <div
                          className={
                            "flex items-center gap-1 " +
                            (schedule.enabled
                              ? "text-gray-900"
                              : "text-gray-500")
                          }
                        >
                          <div
                            className={
                              "flex flex-col items-center leading-snug"
                            }
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExerciseScheduleBeingEditedId(schedule.id)
                              }
                              className="cursor-pointer text-xl text-gray-500"
                            >
                              ✍️
                            </button>
                            <span
                              title={schedule.enabled ? "Enabled" : "Disabled"}
                              className={"cursor-help text-xs"}
                            >
                              {schedule.enabled ? "✅" : "❌"}
                            </span>
                          </div>
                          <div className={"flex flex-col leading-snug"}>
                            <div className="font-semibold">
                              <ExerciseName exerciseInfo={exercise} />
                            </div>
                            {stats ? (
                              <div className="text-xs text-gray-500">
                                {stats?.workedOutAt ? (
                                  <>
                                    ⏳{" "}
                                    <DistanceToNowStrict
                                      date={stats.workedOutAt}
                                    />{" "}
                                  </>
                                ) : null}
                                ({stats.exerciseCount} total)
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      {anySnoozed ? (
                        <td className="text-xs text-gray-500">
                          {schedule.snoozedUntil &&
                          isFuture(schedule.snoozedUntil)
                            ? schedule.snoozedUntil.toJSON().slice(0, 10)
                            : null}
                        </td>
                      ) : null}
                      <td className="leading-none text-gray-500">
                        every{" "}
                        {schedule.frequency.days
                          ? `${schedule.frequency.days.toLocaleString("en-DK")} days`
                          : "N/A"}
                        <br />
                        <small>
                          <small>
                            {stats?.monthlyCount && schedule.frequency.days
                              ? `${(
                                  (stats.monthlyCount /
                                    differenceInDays(
                                      new Date(),
                                      subMonths(new Date(), 1),
                                    ) /
                                    (1 / schedule.frequency.days)) *
                                  100
                                ).toLocaleString("en-DK", {
                                  maximumFractionDigits: 0,
                                })}% 1M`
                              : "N/A"}{" "}
                            /{" "}
                            {stats?.quarterlyCount && schedule.frequency.days
                              ? `${(
                                  (stats.quarterlyCount /
                                    differenceInDays(
                                      new Date(),
                                      subQuarters(new Date(), 1),
                                    ) /
                                    (1 / schedule.frequency.days)) *
                                  100
                                ).toLocaleString("en-DK", {
                                  maximumFractionDigits: 0,
                                })}% 1Q`
                              : "N/A"}
                          </small>
                        </small>
                      </td>
                      <td className="text-xs text-gray-500">
                        {schedule.workingSets ? schedule.workingSets : null}
                      </td>
                      <td className="text-xs text-gray-500">
                        {exercise.inputs.some(
                          (input) => input.type === InputType.Reps,
                        ) &&
                        !exercise.inputs.every(
                          (input) => input.type === InputType.Reps,
                        ) ? (
                          <>
                            {schedule.workingReps
                              ? `${schedule.workingReps}`
                              : null}
                          </>
                        ) : null}
                      </td>
                      {exercise.inputs.some(
                        (input) =>
                          input.type === InputType.Weight ||
                          input.type === InputType.Weightassist ||
                          input.type === InputType.Time ||
                          input.type === InputType.Reps,
                      ) ? (
                        <>
                          <td className="text-xs text-gray-500">
                            {schedule.baseWeight
                              ? `${schedule.baseWeight} ${
                                  exercise.inputs[effortInputIndex]
                                    ?.metric_unit || ""
                                }`
                              : null}
                          </td>
                          <td className="text-xs text-gray-500">
                            {schedule.increment
                              ? `+${schedule.increment} ${
                                  exercise.inputs[effortInputIndex]
                                    ?.metric_unit || ""
                                }`
                              : null}
                          </td>
                          <td className="text-xs text-gray-500">
                            {schedule.deloadFactor
                              ? `${schedule.deloadFactor * 100}%`
                              : null}
                          </td>
                        </>
                      ) : null}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        ) : (
          <div>No exercise schedules yet</div>
        )}
        {!exerciseScheduleBeingEditedId ? (
          <Select
            components={{
              Input: (props) => (
                <components.Input
                  {...props}
                  aria-activedescendant={undefined}
                />
              ),
            }}
            instanceId={selectId}
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
                  a.stats?.workedOutAt ?? epoch,
                  b.stats?.workedOutAt ?? epoch,
                ),
              )
              .map(({ id, name, aliases, stats }) => ({
                label:
                  `${name} ${
                    aliases.length > 1
                      ? `(${new Intl.ListFormat("en-DK", {
                          type: "disjunction",
                        }).format(aliases)})`
                      : aliases[0]
                        ? `(${aliases[0]})`
                        : ""
                  }` + (stats ? ` (${stats.exerciseCount})` : ""),
                value: id,
              }))}
            onChange={(
              selected: OnChangeValue<{ label: string; value: number }, false>,
            ) => {
              if (!selected) return;
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
