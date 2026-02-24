import { ObjectId } from "mongodb";
import { refresh } from "next/cache";
import { auth } from "../auth";
import { Users } from "../models/user.server";
import { FieldSetX, FieldSetY } from "./FieldSet";

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

export default async function UserStuffSettings() {
  const user = (await auth())?.user;

  return user ? (
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
  );
}
