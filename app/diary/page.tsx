import { TZDate } from "@date-fns/tz";
import {
  eachWeekOfInterval,
  endOfISOWeek,
  getISOWeek,
  getISOWeekYear,
  isAfter,
  setISOWeek,
  setISOWeekYear,
  startOfISOWeek,
  subWeeks,
} from "date-fns";
import { Suspense } from "react";
import { auth } from "../../auth";
import LoadMore from "../../components/LoadMore";
import UserStuff from "../../components/UserStuff";
import { dateToString, DEFAULT_TIMEZONE } from "../../utils";
import "../page.css";
import { mostRecentlyScrapedAt } from "./actions";
import { DiaryAgenda } from "./DiaryAgenda";
import { DiaryEntryWeek } from "./DiaryEntryWeek";
import { DiaryEntryWeekWrapper } from "./DiaryEntryWeekWrapper";
import { DiaryPoller } from "./DiaryPoller";

export const maxDuration = 60;
export const revalidate = 3600; // 1 hour

const WEEKS_PER_PAGE = 9;

async function loadMoreData(cursor: {
  startIsoYearAndWeek: string;
  endIsoYearAndWeek: string;
}) {
  "use server";

  const user = (await auth())?.user;
  if (!user) throw new Error("User not found");

  const { startIsoYearAndWeek, endIsoYearAndWeek } = cursor;
  if (!startIsoYearAndWeek || !endIsoYearAndWeek)
    throw new Error("isoYearAndWeek not found");

  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);
  const nowWeek = startOfISOWeek(now);

  const [startIsoYear, startIsoWeek] = startIsoYearAndWeek
    .split("-")
    .map(Number) as [number, number];
  const [endIsoYear, endIsoWeek] = endIsoYearAndWeek.split("-").map(Number) as [
    number,
    number,
  ];
  const startWeekDate = setISOWeekYear(
    setISOWeek(nowWeek, startIsoWeek),
    startIsoYear,
  );
  const endWeekDate = setISOWeekYear(
    setISOWeek(nowWeek, endIsoWeek),
    endIsoYear,
  );
  const isAtLimit = isAfter(new Date(2013, 9), startWeekDate);

  if (isAtLimit) return [null, null] as const;

  const nextStart = subWeeks(endWeekDate, 1);
  const nextEnd = subWeeks(endWeekDate, 1 + WEEKS_PER_PAGE);
  const nextCursor = {
    startIsoYearAndWeek: `${getISOWeekYear(nextStart)}-${getISOWeek(nextStart)}`,
    endIsoYearAndWeek: `${getISOWeekYear(nextEnd)}-${getISOWeek(nextEnd)}`,
  };

  return [
    eachWeekOfInterval(
      { start: startWeekDate, end: endWeekDate },
      { weekStartsOn: 1 },
    ).map((weekDate) => (
      <DiaryEntryWeekWrapper
        user={user}
        key={String(weekDate)}
        isoYearAndWeek={`${getISOWeekYear(weekDate)}-${getISOWeek(weekDate)}`}
      />
    )),
    nextCursor,
  ] as const;
}

export default async function DiaryLayout() {
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
  const nowWeek = endOfISOWeek(now);

  const date = dateToString(now);
  const start = nowWeek;
  const end = subWeeks(nowWeek, WEEKS_PER_PAGE);

  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

  return (
    <>
      <DiaryPoller
        mostRecentlyScrapedAtAction={mostRecentlyScrapedAt}
        loadedAt={now}
        userId={user.id}
      />
      <div className="max-h-[100vh] min-h-[100vh] overflow-hidden">
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
        <div className="flex min-h-[100vh] items-start portrait:flex-col portrait:items-stretch">
          <div className="max-h-[100vh] self-stretch border-black/25 portrait:h-[75vh] portrait:border-b-[0.5px] landscape:w-1/3">
            <DiaryAgenda date={date} user={user} />
          </div>
          <div className="flex max-h-[100vh] flex-1 flex-col items-stretch overflow-y-scroll overscroll-contain portrait:max-h-[25vh]">
            <LoadMore
              initialCursor={{
                startIsoYearAndWeek: `${getISOWeekYear(end)}-${getISOWeek(end)}`,
                endIsoYearAndWeek: `${getISOWeekYear(subWeeks(end, WEEKS_PER_PAGE))}-${getISOWeek(subWeeks(end, WEEKS_PER_PAGE))}`,
              }}
              loadMoreAction={loadMoreData}
            >
              <Suspense
                fallback={weeks.map((weekDate) => (
                  <DiaryEntryWeek
                    key={String(weekDate)}
                    user={user}
                    isoYearAndWeek={`${getISOWeekYear(weekDate)}-${getISOWeek(weekDate)}`}
                  />
                ))}
              >
                {weeks.map((weekDate) => (
                  <DiaryEntryWeekWrapper
                    key={String(weekDate)}
                    user={user}
                    isoYearAndWeek={`${getISOWeekYear(weekDate)}-${getISOWeek(weekDate)}`}
                  />
                ))}
              </Suspense>
            </LoadMore>
          </div>
        </div>
      </div>
    </>
  );
}
