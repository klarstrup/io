import { TZDate } from "@date-fns/tz";
import { Suspense } from "react";
import { auth } from "../../auth";
import UserStuff from "../../components/UserStuff";
import { dateToString, DEFAULT_TIMEZONE } from "../../utils";
import "../page.css";
import { DiaryAgendaDay } from "./DiaryAgendaDay";
import { DiaryPoller } from "./DiaryPoller";

export const maxDuration = 60;
export const revalidate = 3600; // 1 hour

export default async function DiaryLayout(_props: PageProps<"/diary">) {
  const user = (await auth())?.user;

  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);

  return (
    <>
      {user ? <DiaryPoller loadedAt={now} userId={user.id} /> : null}
      <div className="max-h-[100vh] min-h-[100vh]">
        <Suspense
          fallback={
            <div
              style={{
                position: "fixed",
                top: "4px",
                right: "4px",
                paddingLeft: "4px",
                zIndex: 1337,
              }}
            >
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
            </div>
          }
        >
          <UserStuff />
        </Suspense>
        <div className="mx-auto max-h-[100vh] max-w-2xl self-stretch border-black/25 p-2">
          <DiaryAgendaDay date={dateToString(now)} user={user} />
        </div>
      </div>
    </>
  );
}
