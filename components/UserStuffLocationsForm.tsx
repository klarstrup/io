"use client";
import { isPast } from "date-fns";
import { Session } from "next-auth";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { v4 } from "uuid";
import { updateLocation } from "../app/diary/actions";
import { frenchRounded } from "../grades";
import { LocationData } from "../models/location";
import { omit } from "../utils";
import { FieldSetX, FieldSetY } from "./FieldSet";

function UserStuffLocationForm({
  user,
  location,
}: {
  user?: Session["user"];
  location: LocationData & { id: string };
}) {
  const defaultValues = useMemo(() => omit(location, "id"), [location]);
  const {
    handleSubmit,
    register,
    watch,
    reset,
    control,
    setValue,
    formState: { isDirty, isSubmitting },
  } = useForm({ defaultValues });
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const { fields: boulderCircuits, append } = useFieldArray({
    control,
    name: "boulderCircuits",
    keyName: "key",
  });

  const [isEditingName, setIsEditingName] = useState(false);

  const isDisabled = isSubmitting;

  return (
    <form
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onSubmit={handleSubmit(async (data) => {
        if(!user){
          // login gate here
          return;
        }

        const newLocation = await updateLocation(user.id, location.id, data);

        reset(newLocation ? newLocation : defaultValues);
      })}
      className="flex min-w-[50%] flex-1 flex-col gap-1"
    >
      <FieldSetY
        legend={
          isEditingName ? (
            <div className="flex gap-1 text-sm">
              Name:{" "}
              <input
                type="text"
                {...register(`name`)}
                placeholder="Name"
                className="flex-1"
              />{" "}
              <button
                type="button"
                onClick={() => {
                  setValue("name", defaultValues.name);
                  setIsEditingName(false);
                }}
              >
                ❌
              </button>
            </div>
          ) : (
            <>
              {watch("name")}{" "}
              <button type="button" onClick={() => setIsEditingName(true)}>
                ✍️
              </button>
            </>
          )
        }
        className="flex flex-col items-stretch gap-1"
      >
        <FieldSetX
          legend="Bouldering Circuits"
          className="flex flex-col items-stretch gap-1"
        >
          <table>
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
                    onClick={() => {
                      append({
                        id: v4(),
                        name: "",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      });
                    }}
                  >
                    ➕
                  </button>
                </th>
                <th>Name</th>
                <th>Description</th>
                <th>Hold Color</th>
                <th>Label Color</th>
                <th>Grade</th>
                <th>Grade Range</th>
              </tr>
            </thead>
            <tbody>
              {boulderCircuits.map((bC, index) => {
                const initialDeletedAt = location.boulderCircuits?.find(
                  ({ id }) => id === bC.id,
                )?.deletedAt;
                if (initialDeletedAt && isPast(initialDeletedAt)) {
                  return null;
                }

                const deletedAt = watch(`boulderCircuits.${index}.deletedAt`);
                return (
                  <tr
                    key={bC.key}
                    className={
                      deletedAt && isPast(deletedAt) ? "bg-red-500" : ""
                    }
                  >
                    <td>
                      {deletedAt && isPast(deletedAt) ? (
                        <button
                          type="button"
                          onClick={() =>
                            setValue(
                              `boulderCircuits.${index}.deletedAt`,
                              undefined,
                              { shouldDirty: true },
                            )
                          }
                        >
                          🗑️
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setValue(
                              `boulderCircuits.${index}.deletedAt`,
                              new Date(),
                              { shouldDirty: true },
                            )
                          }
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        className="w-16"
                        {...register(`boulderCircuits.${index}.name`)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="w-24"
                        {...register(`boulderCircuits.${index}.description`)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="w-16"
                        {...register(`boulderCircuits.${index}.holdColor`)}
                      />{" "}
                      <input
                        type="text"
                        className="w-16"
                        {...register(
                          `boulderCircuits.${index}.holdColorSecondary`,
                        )}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="w-16"
                        {...register(`boulderCircuits.${index}.labelColor`)}
                      />
                    </td>
                    <td>
                      <select
                        disabled={isDisabled}
                        {...register(`boulderCircuits.${index}.gradeEstimate`, {
                          valueAsNumber: true,
                        })}
                      >
                        <option value="">---</option>
                        {frenchRounded.data.map(({ value, name }) => (
                          <option key={value} value={value}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        disabled={isDisabled}
                        {...register(`boulderCircuits.${index}.gradeRange.0`, {
                          valueAsNumber: true,
                        })}
                      >
                        <option value="">---</option>
                        {frenchRounded.data.map(({ value, name }) => (
                          <option key={value} value={value}>
                            {name}
                          </option>
                        ))}
                      </select>
                      -
                      <select
                        disabled={isDisabled}
                        {...register(`boulderCircuits.${index}.gradeRange.1`, {
                          valueAsNumber: true,
                        })}
                      >
                        <option value="">---</option>
                        {frenchRounded.data.map(({ value, name }) => (
                          <option key={value} value={value}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </FieldSetX>
        <div className="flex items-center justify-center gap-2">
          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className={
              "rounded-md px-2 py-1 text-sm font-semibold " +
              (isDirty
                ? "bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
                : "bg-gray-300 text-gray-600") +
              " " +
              (isSubmitting ? " cursor-not-allowed" : "") +
              (isDirty ? " cursor-pointer" : "") +
              (isSubmitting ? " opacity-50" : "")
            }
          >
            Update
          </button>
          <button
            type="button"
            onClick={() => reset(defaultValues)}
            disabled={!isDirty || isSubmitting}
            className={
              "rounded-md px-2 py-1 text-sm font-semibold " +
              (isDirty
                ? "bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
                : "bg-gray-300 text-gray-600") +
              " " +
              (isSubmitting ? " cursor-not-allowed" : "") +
              (isDirty ? " cursor-pointer" : "") +
              (isSubmitting ? " opacity-50" : "")
            }
          >
            Reset
          </button>
        </div>
      </FieldSetY>
    </form>
  );
}

export default function UserStuffLocationsForm({
  user,
  locations,
}: {
  user?: Session["user"];
  locations?: (LocationData & { id: string })[];
}) {
  return (
    <FieldSetX legend="Locations" className="w-full">
      <div className="flex flex-col gap-1">
        {locations?.map((location) => (
          <UserStuffLocationForm
            key={location.id}
            user={user}
            location={location}
          />
        ))}
      </div>
    </FieldSetX>
  );
}
