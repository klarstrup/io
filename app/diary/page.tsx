import { TZDate } from "@date-fns/tz";
import { subHours } from "date-fns";
import { auth } from "../../auth";
import { dateToString, DEFAULT_TIMEZONE } from "../../utils";
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
      <div className="max-h-screen min-h-screen">
        <div className="mx-auto max-h-screen max-w-2xl self-stretch border-black/25 px-2">
          <DiaryAgendaDay date={dateToString(subHours(now, 5))} user={user} />
        </div>
      </div>
    </>
  );
}
