import { TZDate } from "@date-fns/tz";
import {
  eachWeekOfInterval,
  endOfDay,
  endOfWeek,
  getISOWeek,
  getYear,
  isAfter,
  setISOWeek,
  setYear,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { auth } from "../../../auth";
import { DEFAULT_TIMEZONE } from "../../../utils";
import LoadMore from "../../[[...slug]]/LoadMore";
import UserStuff from "../../[[...slug]]/UserStuff";
import "../../page.css";
import { DiaryAgenda } from "./DiaryAgenda";
import { DiaryEntryWeek } from "./DiaryEntryWeek";
import { getDiaryEntries } from "./getDiaryEntries";

export const maxDuration = 60;
export const revalidate = 3600; // 1 hour

const WEEKS_PER_PAGE = 8;

async function loadMoreData(
  cursor: { startIsoYearAndWeek: string; endIsoYearAndWeek: string },
  params: Record<string, string>,
) {
  "use server";

  const user = (await auth())?.user;
  if (!user) throw new Error("User not found");

  const { startIsoYearAndWeek, endIsoYearAndWeek } = cursor;
  if (!startIsoYearAndWeek || !endIsoYearAndWeek)
    throw new Error("isoYearAndWeek not found");

  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);
  const nowWeek = startOfWeek(now, { weekStartsOn: 1 });

  const [startIsoYear, startIsoWeek] = startIsoYearAndWeek
    .split("-")
    .map(Number) as [number, number];
  const [endIsoYear, endIsoWeek] = endIsoYearAndWeek.split("-").map(Number) as [
    number,
    number,
  ];
  const startWeekDate = setYear(
    setISOWeek(nowWeek, startIsoWeek),
    startIsoYear,
  );
  const endWeekDate = setYear(setISOWeek(nowWeek, endIsoWeek), endIsoYear);
  const isAtLimit = isAfter(new Date(2013, 9), startWeekDate);

  if (isAtLimit) return [null, null] as const;

  const nextStart = subWeeks(endWeekDate, 1);
  const nextEnd = subWeeks(endWeekDate, 1 + WEEKS_PER_PAGE);
  const nextCursor = {
    startIsoYearAndWeek: `${getYear(nextStart)}-${getISOWeek(nextStart)}`,
    endIsoYearAndWeek: `${getYear(nextEnd)}-${getISOWeek(nextEnd)}`,
  };

  return [
    eachWeekOfInterval({
      start: startWeekDate,
      end: endWeekDate,
    }).map((weekDate) => (
      <DiaryEntryWeek
        key={startIsoYearAndWeek + endIsoYearAndWeek}
        isoYearAndWeek={`${getYear(weekDate)}-${getISOWeek(weekDate)}`}
        pickedDate={params.date as `${number}-${number}-${number}` | undefined}
      />
    )),
    nextCursor,
  ] as const;
}

export default async function Page(props: {
  params: Promise<{ date?: `${number}-${number}-${number}`[] }>;
}) {
  const params = await props.params;
  const user = (await auth())?.user;

  if (!user) {
    return (
      <div>
        <span>Hello, stranger!</span>
        <p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/auth/signin">Sign in</a>
        </p>
      </div>
    );
  }

  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);
  const nowWeek = endOfWeek(now, { weekStartsOn: 1 });

  const date =
    params.date?.[0] ||
    `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  const start = nowWeek;
  const end = subWeeks(nowWeek, WEEKS_PER_PAGE);

  const startIsoYearAndWeek = `${getYear(start)}-${getISOWeek(start)}`;
  const endIsoYearAndWeek = `${getYear(end)}-${getISOWeek(end)}`;

  return (
    <div className="max-h-[100vh] min-h-[100vh] overflow-hidden">
      <UserStuff />
      <div className="flex min-h-[100vh] items-start portrait:flex-col portrait:items-stretch">
        <div className="max-h-[100vh] self-stretch border-black/25 portrait:h-[80vh] portrait:border-b-[0.5px] landscape:w-1/3">
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
        <div className="flex max-h-[100vh] flex-1 flex-col items-stretch overflow-y-scroll overscroll-contain portrait:max-h-[20vh]">
          <LoadMore
            initialCursor={{
              startIsoYearAndWeek: `${getYear(end)}-${getISOWeek(end)}`,
              endIsoYearAndWeek: `${getYear(subWeeks(end, WEEKS_PER_PAGE))}-${getISOWeek(subWeeks(end, WEEKS_PER_PAGE))}`,
            }}
            params={params}
            loadMoreAction={loadMoreData}
          >
            {eachWeekOfInterval({
              start,
              end,
            }).map((weekDate) => (
              <DiaryEntryWeek
                key={startIsoYearAndWeek + endIsoYearAndWeek}
                isoYearAndWeek={`${getYear(weekDate)}-${getISOWeek(weekDate)}`}
                pickedDate={params.date?.[0]}
              />
            ))}
          </LoadMore>
        </div>
      </div>
    </div>
  );
}
