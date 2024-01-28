import { getServerSession } from "next-auth";
import { authOptions } from "../../auth";
import { User } from "../../models/user";
import dbConnect from "../../dbConnect";
import { revalidateTag } from "next/cache";
import { getUserProfileBySessionId } from "../../sources/fitocracy";
import { getUser } from "../../sources/toplogger";

export default async function UserStuff() {
  const session = await getServerSession(authOptions);

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

    await userModel.save();

    // Doesn't need an actual tag name(since the new data will be in mongo not via fetch)
    // calling it at all will make the page rerender with the new data.
    revalidateTag("");
  }

  let fitocracyProfile: Awaited<
    ReturnType<typeof getUserProfileBySessionId>
  > | null = null;
  try {
    if (currentUser?.fitocracySessionId) {
      fitocracyProfile = await getUserProfileBySessionId(
        currentUser.fitocracySessionId
      );
    }
  } catch {
    fitocracyProfile = null;
  }

  let topLoggerUser: Awaited<ReturnType<typeof getUser>> | null = null;
  try {
    if (currentUser?.topLoggerId) {
      topLoggerUser = await getUser(currentUser.topLoggerId);
    }
  } catch {
    topLoggerUser = null;
  }

  return (
    <div
      style={{
        position: "absolute",
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
                width={50}
                height={50}
                style={{ borderRadius: "100%" }}
              />
            </span>
            <p>
              <a href="/api/auth/signout">Sign out</a>
            </p>
            {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
            <form action={updateUser}>
              <fieldset>
                <legend>Fitocracy Session ID</legend>
                <input
                  name="fitocracySessionId"
                  defaultValue={currentUser.fitocracySessionId || ""}
                />
                {fitocracyProfile ? "✅" : "❌"}
              </fieldset>
              <fieldset>
                <legend>TopLogger ID</legend>
                <input
                  name="topLoggerId"
                  defaultValue={currentUser.topLoggerId || ""}
                />
                {topLoggerUser ? "✅" : "❌"}
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
