import { TZDate } from "@date-fns/tz";
import { eachWeekOfInterval, endOfISOWeek, isAfter, subWeeks } from "date-fns";
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

async function loadMoreData(cursor: { start: Date; end: Date }) {
  "use server";

  const user = (await auth())?.user;
  if (!user) throw new Error("User not found");

  const { start, end } = cursor;
  if (!start || !end) throw new Error("isoYearAndWeek not found");

  const isAtLimit = isAfter(new Date(2013, 9), start);

  if (isAtLimit) return [null, null] as const;

  return [
    eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map((weekDate) => (
      <DiaryEntryWeekWrapper
        user={user}
        key={String(weekDate)}
        weekDate={weekDate}
      />
    )),
    { start: subWeeks(end, 1), end: subWeeks(end, 1 + WEEKS_PER_PAGE) },
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

  const start = endOfISOWeek(now);
  const end = subWeeks(start, WEEKS_PER_PAGE);

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
            <DiaryAgenda date={dateToString(now)} user={user} />
          </div>
          <div className="flex max-h-[100vh] flex-1 flex-col items-stretch overflow-y-scroll overscroll-contain portrait:max-h-[25vh]">
            <LoadMore
              initialCursor={{
                start: subWeeks(end, 1),
                end: subWeeks(end, 1 + WEEKS_PER_PAGE),
              }}
              loadMoreAction={loadMoreData}
            >
              <Suspense
                fallback={weeks.map((weekDate) => (
                  <DiaryEntryWeek
                    key={String(weekDate)}
                    user={user}
                    weekDate={weekDate}
                  />
                ))}
              >
                {weeks.map((weekDate) => (
                  <DiaryEntryWeekWrapper
                    key={String(weekDate)}
                    user={user}
                    weekDate={weekDate}
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
