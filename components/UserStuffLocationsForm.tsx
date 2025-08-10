"use client";
import { Session } from "next-auth";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { updateLocation } from "../app/diary/actions";
import { LocationData } from "../models/location";
import { omit } from "../utils";
import { FieldSetX, FieldSetY } from "./FieldSet";

function UserStuffLocationForm({
  user,
  location,
}: {
  user: Session["user"];
  location: LocationData & { id: string };
}) {
  const defaultValues = useMemo(() => omit(location, "id"), [location]);
  const {
    handleSubmit,
    register,
    watch,
    reset,
    setValue,
    formState: { isDirty, isSubmitting },
  } = useForm({ defaultValues });
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const [isEditingName, setIsEditingName] = useState(false);

  return (
    <form
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onSubmit={handleSubmit(async (data) => {
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
        <div />
        <div className="flex items-center justify-evenly">
          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className={
              "rounded-md px-2 py-1 text-sm font-semibold " +
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
      </FieldSetY>
    </form>
  );
}

export default function UserStuffLocationsForm({
  user,
  locations,
}: {
  user: Session["user"];
  locations: (LocationData & { id: string })[];
}) {
  return (
    <FieldSetX legend="Locations" className="w-full">
      <div className="flex flex-wrap gap-1">
        <div className="flex flex-col gap-1">
          {locations.map((location) => (
            <UserStuffLocationForm
              key={location.id}
              user={user}
              location={location}
            />
          ))}
        </div>
      </div>
    </FieldSetX>
  );
}
