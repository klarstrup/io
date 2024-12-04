import { ObjectId } from "mongodb";
import { revalidateTag } from "next/cache";
import Link from "next/link";
import { auth } from "../auth";
import { Users } from "../models/user.server";
import { getAllWorkoutExercises } from "../models/workout.server";
import { decodeGeohash } from "../utils";
import { FieldSetX, FieldSetY } from "./FieldSet";
import { UserStuffGeohashInput } from "./UserStuffGeohashInput";
import UserStuffSourcesForm from "./UserStuffSourcesForm";
import UserStuffWorkoutScheduleForm from "./UserStuffWorkoutScheduleForm";

async function updateUser(formData: FormData) {
  "use server";

  const user = (await auth())?.user;

  if (!user) throw new Error("No user found");

  const newUser = { ...user };

  const geohash = formData.get("geohash");
  if (typeof geohash === "string") {
    try {
      if (geohash.trim()) decodeGeohash(geohash.trim());
      newUser.geohash = geohash.trim() || null;
    } catch (e) {
      console.error(e);
    }
  }

  const timeZone = formData.get("timeZone");
  if (typeof timeZone === "string") {
    try {
      if (timeZone.trim()) {
        // Crash out if the timezone is invalid
        new Date().toLocaleString("da-DK", { timeZone: timeZone.trim() });
      }
      newUser.timeZone = timeZone.trim() || null;
    } catch (e) {
      console.error(e);
    }
  }

  await Users.updateOne({ _id: new ObjectId(user.id) }, { $set: newUser });

  // Doesn't need an actual tag name(since the new data will be in mongo not via fetch)
  // calling it at all will make the page rerender with the new data.
  try {
    revalidateTag("");
  } catch (e) {
    console.error(e);
  }
}

export default async function UserStuff() {
  const user = (await auth())?.user;

  return (
    <div
      style={{
        position: "fixed",
        top: "4px",
        right: "4px",
        paddingLeft: "4px",
        zIndex: 1337,
      }}
    >
      <style>
        {`
        #toggle:checked + div {
          display: inline-block !important; 
        }
        #toggle:checked + div + label {
          display: inline-block !important; 
        }
      `}
      </style>
      <label
        htmlFor="toggle"
        style={{
          position: "absolute",
          top: "4px",
          right: "4px",
          zIndex: 1337,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        🌞
      </label>
      <input type="checkbox" id="toggle" className="hidden" />
      <div
        style={{
          background: "yellow",
          padding: "8px",
          display: "none",
          borderRadius: "10px",
          boxShadow: "yellow 0px 0px 20px",
          width: "420px",
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div className="mb-2 flex gap-2">
          <Link href="/diary">Diary</Link>
          <Link href="/">Events</Link>
        </div>
        {user ? (
          <div>
            <span>
              Hello, <strong>{user.name}</strong>
              <small>({user.email})</small>!
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
              <img
                src={user.image || ""}
                className="h-6 max-h-6 w-6 max-w-6 rounded-full"
              />
            </span>
            <p>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/auth/signout">Sign out</a>
            </p>
            <FieldSetX legend="Settings">
              {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
              <form action={updateUser}>
                <input
                  type="submit"
                  value="Update"
                  className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <FieldSetY legend="Location" className="flex">
                    <UserStuffGeohashInput geohash={user.geohash} />
                  </FieldSetY>
                  <FieldSetY legend="Time Zone">
                    <input
                      name="timeZone"
                      defaultValue={user.timeZone || ""}
                      className="flex-1 border-b-2 border-gray-200 focus:border-gray-500"
                    />
                  </FieldSetY>
                </div>
              </form>
            </FieldSetX>
            <FieldSetX legend="Data Sources"
              className="w-full"
            >
              <UserStuffSourcesForm user={user} />
            </FieldSetX>
            <FieldSetX legend="Workout Schedule" className="w-full">
              <UserStuffWorkoutScheduleForm
                exercisesStats={await getAllWorkoutExercises(user)}
                user={user}
              />
            </FieldSetX>
          </div>
        ) : (
          <div>
            <span>Hello, stranger!</span>
            <p>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/auth/signin">Sign in</a>
            </p>
          </div>
        )}
      </div>
      <label
        htmlFor="toggle"
        style={{
          display: "none",
          position: "fixed",
          zIndex: -1,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
        }}
      ></label>
    </div>
  );
}
