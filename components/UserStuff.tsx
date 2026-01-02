import { ObjectId } from "mongodb";
import { refresh } from "next/cache";
import { auth } from "../auth";
import { Locations } from "../models/location.server";
import { Users } from "../models/user.server";
import { getAllWorkoutExercises } from "../models/workout.server";
import { DataSource, dataSourceGroups } from "../sources/utils";
import { omit } from "../utils";
import { FieldSetX, FieldSetY } from "./FieldSet";
import Popover from "./Popover";
import UserStuffLink from "./UserStuffLink";
import UserStuffLocationsForm from "./UserStuffLocationsForm";
import UserStuffSourcesForm from "./UserStuffSourcesForm";
import UserStuffWorkoutScheduleForm from "./UserStuffWorkoutScheduleForm";

async function updateUser(formData: FormData) {
  "use server";

  const user = (await auth())?.user;

  if (!user) throw new Error("No user found");

  const newUser = { ...user };

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

  refresh();
}

export default async function UserStuff() {
  const user = (await auth())?.user;
  const locations = user
    ? await Locations.find({ userId: user.id }, { sort: { name: 1 } }).toArray()
    : [];

  return (
    <>
      <div
        className="fixed left-1/2 z-50 flex -translate-x-1/2 transform items-center gap-2 rounded-2xl border border-[yellow]/25 bg-white/10 px-2 py-1 backdrop-blur-md pointer-coarse:bottom-2 pointer-fine:top-4"
        style={{
          boxShadow:
            "0 0 48px rgba(0, 0, 0, 0.5), 0 0 24px #edab00, 0 0 24px #edab00, 0 0 6px rgba(0, 0, 0, 1), 0 0 1px rgba(0, 0, 0, 1)",
        }}
      >
        <UserStuffLink href="/diary">📔</UserStuffLink>
        <UserStuffLink href="/lists">✅</UserStuffLink>
        <UserStuffLink href="/calendar">🗓️</UserStuffLink>
        <UserStuffLink
          href={"/events" as __next_route_internal_types__.RouteImpl<"/events">}
        >
          🏅
        </UserStuffLink>
        <span className="text-3xl text-gray-400/25 xl:text-4xl">❘</span>
        {user ? (
          <>
            <Popover control={<span className="text-3xl xl:text-4xl">⚙️</span>}>
              <div className="absolute left-1/2 z-30 max-h-[66vh] w-96 max-w-[88vw] -translate-x-1/2 overflow-auto overscroll-contain rounded-lg bg-[yellow] p-2 shadow-[black_0_0_20px] pointer-coarse:bottom-9 pointer-fine:top-9">
                {user ? (
                  <div className="flex flex-col gap-2">
                    <FieldSetX legend="Workout Schedule" className="w-full">
                      <UserStuffWorkoutScheduleForm
                        exercisesStats={await getAllWorkoutExercises(user)}
                        user={user}
                      />
                    </FieldSetX>
                  </div>
                ) : null}
              </div>
            </Popover>
            <Popover control={<span className="text-3xl xl:text-4xl">📡</span>}>
              <div className="absolute left-1/2 z-30 max-h-[66vh] w-96 max-w-[88vw] -translate-x-1/2 overflow-auto overscroll-contain rounded-lg bg-[yellow] p-2 shadow-[black_0_0_20px] pointer-coarse:bottom-9 pointer-fine:top-9">
                <UserStuffSourcesForm
                  user={user}
                  sourceOptions={[
                    ...dataSourceGroups.workouts,
                    ...dataSourceGroups.events,
                    ...dataSourceGroups.food,
                    ...dataSourceGroups.weather,
                    DataSource.Songkick,
                  ]}
                />
              </div>
            </Popover>
            <Popover
              control={<span className="text-3xl xl:text-4xl">📍</span>}
              className="-mx-1"
            >
              <div className="absolute left-1/2 z-30 max-h-[66vh] w-140 max-w-[88vw] -translate-x-1/2 overflow-auto overscroll-contain rounded-lg bg-[yellow] p-2 shadow-[black_0_0_20px] pointer-coarse:bottom-9 pointer-fine:top-9">
                <UserStuffLocationsForm
                  user={user}
                  locations={locations?.map((document) => ({
                    ...omit(document, "_id"),
                    id: document._id.toString(),
                  }))}
                />
              </div>
            </Popover>
          </>
        ) : null}
        <Popover control={<span className="text-3xl xl:text-4xl">🌞</span>}>
          <div className="absolute left-1/2 z-30 max-h-[66vh] w-96 max-w-[88vw] -translate-x-1/2 overflow-auto overscroll-contain rounded-lg bg-[yellow] p-2 shadow-[black_0_0_20px] pointer-coarse:bottom-9 pointer-fine:top-9">
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
                      className="rounded-sm bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <FieldSetY legend="Time Zone">
                        <input
                          type="text"
                          name="timeZone"
                          defaultValue={user.timeZone || ""}
                          className="flex-1 border-b-2 border-gray-200 focus:border-gray-500"
                        />
                      </FieldSetY>
                    </div>
                  </form>
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
        </Popover>
      </div>
    </>
  );
}
