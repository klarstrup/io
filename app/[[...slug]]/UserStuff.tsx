import { revalidateTag } from "next/cache";
import { auth } from "../../auth";
import dbConnect from "../../dbConnect";
import { User } from "../../models/user";
import {
  MyFitnessPal,
  getMyFitnessPalSession,
} from "../../sources/myfitnesspal";
import { RunDouble, getRunDoubleUser } from "../../sources/rundouble";
import { TopLogger, fetchUser } from "../../sources/toplogger";

export default async function UserStuff() {
  const session = await auth();

  const currentUser = (await User.findOne({ _id: session?.user.id }))?.toJSON();

  async function updateUser(formData: FormData) {
    "use server";
    await dbConnect();

    const userModel = await User.findOne({ _id: session?.user.id });
    if (!userModel) throw new Error("No user found");

    const fitocracySessionId = formData.get("fitocracySessionId");
    if (typeof fitocracySessionId === "string") {
      userModel.fitocracySessionId = fitocracySessionId.trim() || null;
    }

    const topLoggerId = formData.get("topLoggerId");
    if (typeof topLoggerId === "string") {
      userModel.topLoggerId = topLoggerId.trim()
        ? Number(topLoggerId.trim())
        : null;
    }

    const myFitnessPalToken = formData.get("myFitnessPalToken");
    if (typeof myFitnessPalToken === "string") {
      userModel.myFitnessPalToken = myFitnessPalToken.trim() || null;
    }
    const runDoubleId = formData.get("runDoubleId");
    if (typeof runDoubleId === "string") {
      userModel.runDoubleId = runDoubleId.trim() || null;
    }

    await userModel.save();

    // Doesn't need an actual tag name(since the new data will be in mongo not via fetch)
    // calling it at all will make the page rerender with the new data.
    try {
      revalidateTag("");
    } catch (e) {
      console.error(e);
    }
  }

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
  getRunDoubleUser;

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
        }}
      >
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
            {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
            <form action={updateUser}>
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
