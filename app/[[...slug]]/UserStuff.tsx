import { ObjectId } from "mongodb";
import { revalidateTag } from "next/cache";
import Link from "next/link";
import { auth } from "../../auth";
import { getDB } from "../../dbConnect";
import { type IUser } from "../../models/user";
import { MyFitnessPal } from "../../sources/myfitnesspal";
import { getMyFitnessPalSession } from "../../sources/myfitnesspal.server";
import { RunDouble, getRunDoubleUser } from "../../sources/rundouble";
import { TopLogger, fetchUser } from "../../sources/toplogger";
import { UserStuffGeohashInput } from "./UserStuffGeohashInput";
import { decodeGeohash } from "../../utils";

async function updateUser(formData: FormData) {
  "use server";

  const session = await auth();
  const db = await getDB();

  const user = session?.user.id
    ? await db
        .collection<IUser>("users")
        .findOne({ _id: new ObjectId(session.user.id) })
    : null;
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

  await db
    .collection<IUser>("users")
    .updateOne({ _id: user._id }, { $set: newUser });

  // Doesn't need an actual tag name(since the new data will be in mongo not via fetch)
  // calling it at all will make the page rerender with the new data.
  try {
    revalidateTag("");
  } catch (e) {
    console.error(e);
  }
}

export default async function UserStuff() {
  const session = await auth();
  const db = await getDB();

  const currentUser = session?.user.id
    ? await db
        .collection<IUser>("users")
        .findOne({ _id: new ObjectId(session.user.id) })
    : null;

  let topLoggerUser: TopLogger.User | null = null;
  try {
    if (currentUser?.topLoggerId) {
      topLoggerUser = await fetchUser(currentUser.topLoggerId);
    }
  } catch {
    topLoggerUser = null;
  }

  let myFitnessPalUser: MyFitnessPal.User | null = null;
  try {
    if (currentUser?.myFitnessPalToken) {
      myFitnessPalUser = (
        await getMyFitnessPalSession(currentUser.myFitnessPalToken)
      ).user;
    }
  } catch {
    myFitnessPalUser = null;
  }

  let runDoubleUser: RunDouble.User | null = null;
  try {
    if (currentUser?.runDoubleId) {
      runDoubleUser = await getRunDoubleUser(currentUser.runDoubleId);
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
      <input type="checkbox" id="toggle" style={{ display: "none" }} />
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
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginBottom: "6px",
          }}
        >
          <Link href="/diary">Diary</Link>
          <Link href="/">Events</Link>
        </div>
        {currentUser ? (
          <div>
            <span>
              Hello, <strong>{currentUser.name}</strong>
              <small>({currentUser.email})</small>!
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
              <img
                src={currentUser.image || ""}
                width={48}
                height={48}
                style={{ borderRadius: "100%" }}
              />
            </span>
            <p>
              <a href="/api/auth/signout">Sign out</a>
            </p>
            <form action={updateUser}>
              <fieldset style={{ display: "flex", gap: "6px" }}>
                <legend>Location</legend>
                <UserStuffGeohashInput geohash={currentUser.geohash} />
              </fieldset>
              <fieldset style={{ display: "flex", gap: "6px" }}>
                <legend>TopLogger ID</legend>
                <input
                  name="topLoggerId"
                  defaultValue={currentUser.topLoggerId || ""}
                  style={{ flex: 1 }}
                />
                {topLoggerUser ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="TopLogger Avatar"
                    src={topLoggerUser.avatar}
                    width={24}
                    height={24}
                    style={{ borderRadius: "100%" }}
                  />
                ) : (
                  "❌"
                )}
              </fieldset>
              <fieldset style={{ display: "flex", gap: "6px" }}>
                <legend>MyFitnessPal Token</legend>
                <input
                  name="myFitnessPalToken"
                  defaultValue={currentUser.myFitnessPalToken || ""}
                  style={{ flex: 1 }}
                />
                {myFitnessPalUser ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="MyFitnessPal Avatar"
                    src={myFitnessPalUser.image}
                    width={24}
                    height={24}
                    style={{ borderRadius: "100%" }}
                  />
                ) : (
                  "❌"
                )}
              </fieldset>
              <fieldset style={{ display: "flex", gap: "6px" }}>
                <legend>RunDouble ID</legend>
                <input
                  name="runDoubleId"
                  defaultValue={currentUser.runDoubleId || ""}
                  style={{ flex: 1 }}
                />
                {runDoubleUser ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="MyFitnessPal Avatar"
                    src={`https://gravatar.com/avatar/${runDoubleUser.gravatarHash}`}
                    width={24}
                    height={24}
                    style={{ borderRadius: "100%" }}
                  />
                ) : (
                  "❌"
                )}
              </fieldset>
              <fieldset style={{ display: "flex", gap: "6px" }}>
                <legend>iCal URLs</legend>
                <textarea
                  name="icalUrls"
                  defaultValue={currentUser.icalUrls?.join("\n") || ""}
                  style={{ flex: 1 }}
                  rows={
                    currentUser.icalUrls ? currentUser.icalUrls.length + 2 : 5
                  }
                  placeholder={
                    "https://example.com/calendar.ics\nhttps://example.com/other.ics"
                  }
                />
              </fieldset>
              <input type="submit" value="Update" />
            </form>
          </div>
        ) : (
          <div>
            <span>Hello, stranger!</span>
            <p>
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
