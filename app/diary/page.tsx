import { TZDate } from "@date-fns/tz";
import {
  endOfDay,
  getISOWeek,
  getYear,
  isAfter,
  setISOWeek,
  setYear,
  startOfDay,
  subWeeks,
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

  const { isoYearAndWeek } = JSON.parse(cursor) as { isoYearAndWeek?: string };
  if (!isoYearAndWeek) throw new Error("isoYearAndWeek not found");
  const [isoYear, isoWeek] = isoYearAndWeek.split("-").map(Number) as [
    number,
    number,
  ];
  const weekDate = setYear(setISOWeek(new Date(), isoWeek), isoYear);
  const isAtLimit = isAfter(new Date(2013, 9), weekDate);

  if (isAtLimit) return [null, null] as const;

  const next = subWeeks(weekDate, 1);
  const nextCursor = JSON.stringify({
    isoYearAndWeek: `${getYear(next)}-${getISOWeek(next)}`,
  });

  return [
    <DiaryEntryWeek
      key={isoWeek}
      isoYearAndWeek={isoYearAndWeek}
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

  const isoYearAndWeek = `${getYear(now)}-${getISOWeek(now)}`;

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
          className="flex flex-1 flex-col items-stretch"
          style={{
            overflowY: "scroll",
            maxHeight: "100vh",
          }}
        >
          <LoadMore
            params={params}
            loadMoreAction={loadMoreData}
            initialCursor={JSON.stringify({
              isoYearAndWeek: `${getYear(subWeeks(now, 1))}-${getISOWeek(subWeeks(now, 1))}`,
            })}
          >
            <DiaryEntryWeek
              pickedDate={params.date}
              isoYearAndWeek={isoYearAndWeek}
            />
          </LoadMore>
        </div>
      </div>
    </div>
  );
}
