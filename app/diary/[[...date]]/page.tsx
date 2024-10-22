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
import "../../page.css";
import { DiaryAgenda } from "./DiaryAgenda";
import { DiaryEntryWeek } from "./DiaryEntryWeek";
import { getDiaryEntries } from "./getDiaryEntries";
import { auth } from "../../../auth";
import { DEFAULT_TIMEZONE } from "../../../utils";
import UserStuff from "../../[[...slug]]/UserStuff";
import LoadMore from "../../[[...slug]]/LoadMore";

export const maxDuration = 60;
export const revalidate = 3600; // 1 hour

async function loadMoreData(
  cursor: { isoYearAndWeek: string },
  params: Record<string, string>,
) {
  "use server";

  const user = (await auth())?.user;
  if (!user) throw new Error("User not found");

  const { isoYearAndWeek } = cursor;
  if (!isoYearAndWeek) throw new Error("isoYearAndWeek not found");
  const [isoYear, isoWeek] = isoYearAndWeek.split("-").map(Number) as [
    number,
    number,
  ];
  const weekDate = setYear(setISOWeek(new Date(), isoWeek), isoYear);
  const isAtLimit = isAfter(new Date(2013, 9), weekDate);

  if (isAtLimit) return [null, null] as const;

  const next = subWeeks(weekDate, 1);
  const nextCursor = {
    isoYearAndWeek: `${getYear(next)}-${getISOWeek(next)}`,
  };

  return [
    <DiaryEntryWeek
      key={isoWeek}
      isoYearAndWeek={isoYearAndWeek}
      pickedDate={params.date as `${number}-${number}-${number}` | undefined}
    />,
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

  const date =
    params.date?.[0] ||
    `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  const isoYearAndWeek = `${getYear(now)}-${getISOWeek(now)}`;

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
            params={params}
            loadMoreAction={loadMoreData}
            initialCursor={{
              isoYearAndWeek: `${getYear(subWeeks(now, 1))}-${getISOWeek(subWeeks(now, 1))}`,
            }}
          >
            <DiaryEntryWeek
              pickedDate={params.date?.[0]}
              isoYearAndWeek={isoYearAndWeek}
            />
          </LoadMore>
        </div>
      </div>
    </div>
  );
}
