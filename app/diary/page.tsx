import { TZDate } from "@date-fns/tz";
import {
  endOfDay,
  getISOWeek,
  isAfter,
  setISOWeek,
  startOfDay,
} from "date-fns";
import { auth } from "../../auth";
import { DEFAULT_TIMEZONE } from "../../utils";
import LoadMore from "../[[...slug]]/LoadMore";
import UserStuff from "../[[...slug]]/UserStuff";
import "../page.css";
import { DiaryAgenda } from "./DiaryAgenda";
import { DiaryEntryWeek } from "./DiaryEntryWeek";
import { getDiaryEntries } from "./getDiaryEntries";

export const maxDuration = 60;
export const revalidate = 3600; // 1 hour

async function loadMoreData(cursor: string, params: Record<string, string>) {
  "use server";

  const user = (await auth())?.user;
  if (!user) throw new Error("User not found");

  const { isoWeek } = JSON.parse(cursor) as { isoWeek?: number };
  if (!isoWeek) throw new Error("From not found");

  const isAtLimit = isAfter(new Date(2013, 9), setISOWeek(new Date(), isoWeek));

  if (isAtLimit) return [null, null] as const;

  const nextCursor = JSON.stringify({ isoWeek: isoWeek - 1 });

  return [
    <DiaryEntryWeek
      key={isoWeek}
      isoWeek={isoWeek}
      pickedDate={params.date as `${number}-${number}-${number}` | undefined}
    />,
    nextCursor,
  ] as const;
}

export default async function Page({
  params,
}: {
  params: { date?: `${number}-${number}-${number}` };
}) {
  const user = (await auth())?.user;

  if (!user) {
    return (
      <div>
        <span>Hello, stranger!</span>
        <p>
          <a href="/api/auth/signin">Sign in</a>
        </p>
      </div>
    );
  }

  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const now = TZDate.tz(timeZone);

  const date =
    params.date ||
    `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  const isoWeek = getISOWeek(TZDate.tz(timeZone));

  return (
    <div className="min-h-[100vh]">
      <UserStuff />
      <div className="flex min-h-[100vh] items-start">
        <div className="max-h-[100vh] w-1/3 self-stretch">
          <DiaryAgenda
            date={date}
            diaryEntry={
              (
                await getDiaryEntries({
                  from: startOfDay(new Date(date)),
                  to: endOfDay(new Date(date)),
                })
              )[0]?.[1]
            }
            user={user}
          />
        </div>
        <div
          className="flex-1"
          style={{
            overflowY: "scroll",
            maxHeight: "100vh",
          }}
        >
          <LoadMore
            params={params}
            loadMoreAction={loadMoreData}
            initialCursor={JSON.stringify({ isoWeek: isoWeek - 1 })}
          >
            <DiaryEntryWeek pickedDate={params.date} isoWeek={isoWeek} />
          </LoadMore>
        </div>
      </div>
    </div>
  );
}
