import { TZDate } from "@date-fns/tz";
import { eachWeekOfInterval, endOfISOWeek, isAfter, subWeeks } from "date-fns";
import { Suspense } from "react";
import { auth } from "../../auth";
import LoadMore from "../../components/LoadMore";
import { DEFAULT_TIMEZONE } from "../../utils";
import { DiaryPoller } from "../diary/DiaryPoller";
import { DiaryEntryWeek } from "./DiaryEntryWeek";
import { DiaryEntryWeekWrapper } from "./DiaryEntryWeekWrapper";

export const maxDuration = 45;

const WEEKS_PER_PAGE = 9;

async function loadMoreData(cursor: { start: Date; end: Date }) {
  "use server";

  const user = (await auth())?.user;

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

export default async function CalendarLayout(_props: PageProps<"/calendar">) {
  const user = (await auth())?.user;

  const timeZone = user?.timeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);

  const start = endOfISOWeek(now);
  const end = subWeeks(start, WEEKS_PER_PAGE);

  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

  return (
    <>
      {user ? <DiaryPoller loadedAt={now} userId={user.id} /> : null}
      <div className="max-h-screen min-h-screen">
        <div className="mx-auto flex max-w-6xl flex-1 flex-col items-stretch">
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
    </>
  );
}
