import { ObjectId } from "mongodb";
import { revalidateTag } from "next/cache";
import Link from "next/link";
import { auth } from "../auth";
import { isAuthTokens } from "../lib";
import { Users } from "../models/user.server";
import { MyFitnessPal } from "../sources/myfitnesspal";
import { getMyFitnessPalSession } from "../sources/myfitnesspal.server";
import { RunDouble, getRunDoubleUser } from "../sources/rundouble";
import { TopLogger, fetchUser } from "../sources/toplogger";
import { decodeGeohash } from "../utils";
import { FieldSetX, FieldSetY } from "./FieldSet";
import { UserStuffGeohashInput } from "./UserStuffGeohashInput";

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

  const fitocracySessionId = formData.get("fitocracySessionId");
  if (typeof fitocracySessionId === "string") {
    newUser.fitocracySessionId = fitocracySessionId.trim() || null;
  }

  const topLoggerId = formData.get("topLoggerId");
  if (typeof topLoggerId === "string") {
    newUser.topLoggerId = topLoggerId.trim()
      ? Number(topLoggerId.trim())
      : null;
  }

  const topLoggerGraphQLId = formData.get("topLoggerGraphQLId");
  if (typeof topLoggerGraphQLId === "string") {
    newUser.topLoggerGraphQLId = topLoggerGraphQLId.trim() || null;
  }

  const topLoggerAuthTokens = formData.get("topLoggerAuthTokens");
  if (typeof topLoggerAuthTokens === "string") {
    try {
      const authTokens = JSON.parse(topLoggerAuthTokens.trim()) as unknown;
      if (isAuthTokens(authTokens)) newUser.topLoggerAuthTokens = authTokens;
    } catch (e) {
      console.error(e);
    }
  }

  const myFitnessPalToken = formData.get("myFitnessPalToken");
  if (typeof myFitnessPalToken === "string") {
    newUser.myFitnessPalToken = myFitnessPalToken.trim() || null;
  }
  const runDoubleId = formData.get("runDoubleId");
  if (typeof runDoubleId === "string") {
    newUser.runDoubleId = runDoubleId.trim() || null;
  }

  const icalUrls = formData.get("icalUrls");
  if (typeof icalUrls === "string") {
    newUser.icalUrls = icalUrls
      .trim()
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url);
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

  let topLoggerUser: TopLogger.User | null = null;
  try {
    if (user?.topLoggerId) {
      topLoggerUser = await fetchUser(user.topLoggerId);
    }
  } catch {
    topLoggerUser = null;
  }

  let myFitnessPalUser: MyFitnessPal.User | null = null;
  try {
    if (user?.myFitnessPalToken) {
      myFitnessPalUser = (await getMyFitnessPalSession(user.myFitnessPalToken))
        .user;
    }
  } catch {
    myFitnessPalUser = null;
  }

  let runDoubleUser: RunDouble.User | null = null;
  try {
    if (user?.runDoubleId) {
      runDoubleUser = await getRunDoubleUser(user.runDoubleId);
    }
  } catch {
    runDoubleUser = null;
  }

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
            {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
            <form action={updateUser}>
              <FieldSetY
                className="flex items-center gap-1.5"
                legend="Location"
              >
                <UserStuffGeohashInput geohash={user.geohash} />
              </FieldSetY>
              <FieldSetY
                className="flex items-center gap-1.5"
                legend="Time Zone"
              >
                <input
                  name="timeZone"
                  defaultValue={user.timeZone || ""}
                  className="flex-1 border-b-2 border-gray-200 focus:border-gray-500"
                />
              </FieldSetY>
              <FieldSetX
                className="flex items-center gap-1.5"
                legend="TopLogger ID"
              >
                <input
                  name="topLoggerId"
                  defaultValue={user.topLoggerId || ""}
                  className="flex-1 border-b-2 border-gray-200 focus:border-gray-500"
                />
                {topLoggerUser ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="TopLogger Avatar"
                    src={topLoggerUser.avatar}
                    className="h-6 max-h-6 w-6 max-w-6 rounded-full"
                  />
                ) : (
                  <span className="flex h-6 max-h-6 w-6 max-w-6 items-center justify-center rounded-full">
                    ❌
                  </span>
                )}
              </FieldSetX>
              <FieldSetX
                className="flex flex-col items-center gap-1.5"
                legend="TopLogger GQL User"
              >
                <label>
                  <code>TopLogger GraphQL ID</code>
                  <input
                    name="topLoggerGraphQLId"
                    defaultValue={user.topLoggerGraphQLId || ""}
                    className="flex-1 border-b-2 border-gray-200 focus:border-gray-500"
                  />
                </label>
                <label>
                  <code>tl-auth</code>
                  <input
                    name="topLoggerAuthTokens"
                    defaultValue={
                      (user.topLoggerAuthTokens &&
                        JSON.stringify(user.topLoggerAuthTokens)) ||
                      ""
                    }
                    className="flex-1 border-b-2 border-gray-200 focus:border-gray-500"
                  />
                </label>
              </FieldSetX>
              <FieldSetX
                className="flex items-center gap-1.5"
                legend="MyFitnessPal Token"
              >
                <input
                  name="myFitnessPalToken"
                  defaultValue={user.myFitnessPalToken || ""}
                  className="flex-1 border-b-2 border-gray-200 focus:border-gray-500"
                />
                {myFitnessPalUser ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="MyFitnessPal Avatar"
                    src={myFitnessPalUser.image}
                    className="h-6 max-h-6 w-6 max-w-6 rounded-full"
                  />
                ) : (
                  <span className="flex h-6 max-h-6 w-6 max-w-6 items-center justify-center rounded-full">
                    ❌
                  </span>
                )}
              </FieldSetX>
              <FieldSetX
                className="flex items-center gap-1.5"
                legend="RunDouble ID"
              >
                <input
                  name="runDoubleId"
                  defaultValue={user.runDoubleId || ""}
                  className="flex-1 border-b-2 border-gray-200 focus:border-gray-500"
                />
                {runDoubleUser ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="MyFitnessPal Avatar"
                    src={`https://gravatar.com/avatar/${runDoubleUser.gravatarHash}`}
                    className="h-6 max-h-6 w-6 max-w-6 rounded-full"
                  />
                ) : (
                  <span className="flex h-6 max-h-6 w-6 max-w-6 items-center justify-center rounded-full">
                    ❌
                  </span>
                )}
              </FieldSetX>
              <FieldSetX
                className="flex items-center gap-1.5"
                legend="iCal URLs"
              >
                <textarea
                  name="icalUrls"
                  defaultValue={user.icalUrls?.join("\n") || ""}
                  className="flex-1 border-b-2 border-gray-200 focus:border-gray-500"
                  rows={user.icalUrls ? user.icalUrls.length + 2 : 5}
                  placeholder={
                    "https://example.com/calendar.ics\nhttps://example.com/other.ics"
                  }
                />
              </FieldSetX>
              <input type="submit" value="Update" />
            </form>
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
