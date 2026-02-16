"use client";
import { useApolloClient } from "@apollo/client/react";
import { isPast } from "date-fns";
import { Session } from "next-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { v4 } from "uuid";
import { updateLocation } from "../app/diary/actions";
import { frenchRounded } from "../grades";
import { LocationData } from "../models/location";
import { omit } from "../utils";
import { FieldSetX, FieldSetY } from "./FieldSet";
import { TextAreaThatGrows } from "./TextAreaThatGrows";

function UserStuffLocationForm({
  user,
  location,
  onDismiss,
}: {
  user?: Session["user"];
  location: LocationData & { id: string };
  onDismiss: () => void;
}) {
  const router = useRouter();
  const client = useApolloClient();
  const defaultValues = useMemo(
    () => ({
      ...omit(location, "id"),
      knownAddresses: location.knownAddresses?.join("\n") ?? "",
    }),
    [location],
  );
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
        if (!user) {
          // login gate here
          return;
        }

        console.log({ data });

        const newLocation = await updateLocation(user.id, location.id, {
          ...data,
          knownAddresses: data.knownAddresses
            ?.split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
        });
        router.refresh();
        await client.refetchQueries({ include: "all" });
        reset(
          newLocation
            ? {
                ...newLocation,
                knownAddresses: newLocation.knownAddresses?.join("\n") ?? "",
              }
            : defaultValues,
        );
        onDismiss();
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
                autoFocus
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
              <Link
                prefetch={false}
                href={`/diary/locations/${location.id}`}
                className="font-bold"
                style={{ color: "#edab00" }}
              >
                {watch("name")}
              </Link>{" "}
              <button type="button" onClick={() => setIsEditingName(true)}>
                ✍️
              </button>
            </>
          )
        }
        className="flex flex-col items-stretch gap-1"
      >
        <label>
          Favorite: <input type="checkbox" {...register("isFavorite")} />
        </label>
        <label>
          Known Addresses (line separated):
          <TextAreaThatGrows
            {...register("knownAddresses")}
            placeholder={`123 Main St\n456 Elm St`}
            className="-mt-px -mb-px w-full bg-transparent p-0.5 font-mono text-sm"
          />
        </label>
        <FieldSetX
          legend="Bouldering Circuits"
          className="flex flex-col items-stretch gap-1"
        >
          <table className="border-separate border-spacing-1">
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
                {boulderCircuits?.length ? (
                  <>
                    <th>Name</th>
                    <th>Zones</th>
                    <th>Hold Color</th>
                    <th>Label Color</th>
                    <th>Grade</th>
                    <th>Grade Range</th>
                  </>
                ) : null}
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
                        className="w-full"
                        {...register(`boulderCircuits.${index}.name`)}
                      />
                      <input
                        type="text"
                        className="w-full"
                        placeholder="Description"
                        {...register(`boulderCircuits.${index}.description`)}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        className="w-full"
                        {...register(`boulderCircuits.${index}.hasZones`)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="w-full"
                        placeholder="Primary"
                        {...register(`boulderCircuits.${index}.holdColor`)}
                      />{" "}
                      <input
                        type="text"
                        className="w-full"
                        placeholder="Secondary"
                        {...register(
                          `boulderCircuits.${index}.holdColorSecondary`,
                        )}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="w-full"
                        {...register(`boulderCircuits.${index}.labelColor`)}
                      />
                    </td>
                    <td>
                      <select
                        disabled={isDisabled}
                        {...register(`boulderCircuits.${index}.gradeEstimate`, {
                          valueAsNumber: true,
                        })}
                        className="w-full"
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
                      <div className="flex items-center justify-center gap-1">
                        <select
                          disabled={isDisabled}
                          {...register(
                            `boulderCircuits.${index}.gradeRange.0`,
                            {
                              valueAsNumber: true,
                            },
                          )}
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
                          {...register(
                            `boulderCircuits.${index}.gradeRange.1`,
                            { valueAsNumber: true },
                          )}
                        >
                          <option value="">---</option>
                          {frenchRounded.data.map(({ value, name }) => (
                            <option key={value} value={value}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </FieldSetX>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onDismiss()}
            disabled={isSubmitting}
            className={
              "rounded-md px-2 py-1 text-sm font-semibold " +
              (isSubmitting ? " cursor-not-allowed" : " cursor-pointer") +
              (isSubmitting ? " opacity-50" : "")
            }
          >
            Cancel
          </button>
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
  const [editingLocationId, setEditingLocationId] = useState<string | null>(
    null,
  );

  const locationBeingEdited = locations?.find(
    (location) => location.id === editingLocationId,
  );

  return (
    <div className="flex flex-col items-stretch gap-2">
      <h1 className="text-lg font-bold">Locations</h1>
      {locationBeingEdited ? (
        <div className="flex flex-col gap-1">
          <UserStuffLocationForm
            user={user}
            location={locationBeingEdited}
            onDismiss={() => setEditingLocationId(null)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-2">
          {locations?.map((location) => (
            <div
              key={location.id}
              className="flex items-center gap-2 rounded-md bg-gray-100 px-2 py-1"
            >
              <button
                type="button"
                onClick={() => setEditingLocationId(location.id)}
                className={"cursor-pointer text-2xl"}
              >
                ✍️
              </button>
              <Link
                prefetch={false}
                href={`/diary/locations/${location.id}`}
                className="font-bold"
                style={{ color: "#edab00" }}
              >
                {location.name}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
