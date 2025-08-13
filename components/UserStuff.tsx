import { ObjectId } from "mongodb";
import { revalidateTag } from "next/cache";
import Link from "next/link";
import { auth } from "../auth";
import { Users } from "../models/user.server";
import { FieldSetX, FieldSetY } from "./FieldSet";
import Popover from "./Popover";

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
    <Popover
      className="fixed top-1 right-1 z-20 pl-1"
      control={
        <span className="absolute top-1 right-1 z-10 cursor-pointer select-none">
          🌞
        </span>
      }
    >
      <div className="absolute top-4 right-4 z-30 max-h-[66vh] w-96 max-w-[80vw] overflow-auto overscroll-contain rounded-lg bg-[yellow] p-2 shadow-[yellow_0_0_20px]">
        <div className="mb-2 flex gap-2">
          <Link prefetch={false} href="/diary">
            Diary
          </Link>
          <Link prefetch={false} href="/events/">
            Events
          </Link>
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
  );
}
