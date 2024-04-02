/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  differenceInMilliseconds,
  isAfter,
  isBefore,
  startOfMonth,
} from "date-fns";
import Script from "next/script";
import dbConnect from "../../dbConnect";
import type { EventEntry } from "../../lib";
import { User } from "../../models/user";
import {
  getIoClimbAlongCompetitionEventEntry,
  ioClimbAlongEventsWithIds,
} from "../../sources/climbalong";
import { getSongkickEvents } from "../../sources/songkick";
import {
  getSportsTimingEventEntry,
  ioSportsTimingEventsWithIds,
} from "../../sources/sportstiming";
import {
  TopLogger,
  fetchUser,
  getTopLoggerGroupEventEntry,
} from "../../sources/toplogger";
import "../page.css";
import { LoadPreviousMonthWhenYouSeeThisAlright } from "./LoadNextMonthWhenYouSeeThisAlright";
import { TimelineEventsList } from "./TimelineEventsList";
import UserStuff from "./UserStuff";

export default async function Home({
  params: { slug: [disciplinesString] = [] },
  searchParams,
}: {
  params: { slug?: string[] };
  searchParams: { [key: string]: string };
}) {
  const urlDisciplines: string[] | undefined =
    (disciplinesString !== "index" &&
      (disciplinesString as string | undefined)?.split("+")) ||
    undefined;
  const from = searchParams.from
    ? new Date(searchParams.from as unknown as string)
    : startOfMonth(new Date());
  const to = searchParams.to
    ? new Date(searchParams.to as unknown as string)
    : undefined;
  const events = await getData(urlDisciplines, { from, to });

  return (
    <div>
      <UserStuff />
      <section id="timeline">
        <TimelineEventsList
          events={events}
          urlDisciplines={urlDisciplines}
          from={from}
          to={to}
        />
        <LoadPreviousMonthWhenYouSeeThisAlright from={from} />
      </section>
      <Script key={String(new Date())} id={String(new Date())}>
        {`
        var balanceColumns = ${String(balanceColumns)};
        window.addEventListener("resize", () => {
          balanceColumns();
          setTimeout(() => balanceColumns(), 200);
          setTimeout(() => balanceColumns(), 400);
          setTimeout(() => balanceColumns(), 600);
        });
        window.addEventListener("popstate", () => {
          balanceColumns();
          setTimeout(() => balanceColumns(), 200);
          setTimeout(() => balanceColumns(), 400);
          setTimeout(() => balanceColumns(), 600);
        });
        window.addEventListener("navigate", () => {
          balanceColumns();
          setTimeout(() => balanceColumns(), 200);
          setTimeout(() => balanceColumns(), 400);
          setTimeout(() => balanceColumns(), 600);
        });
        balanceColumns();
        setTimeout(() => balanceColumns(), 200);
        setTimeout(() => balanceColumns(), 400);
        setTimeout(() => balanceColumns(), 600);
        `}
      </Script>
    </div>
  );
}

function balanceColumns() {
  const timelines = document.querySelectorAll<HTMLElement>("#timeline");
  for (const timeline of Array.from(timelines)) {
    let leftColumnHeight = 0;
    let rightColumnHeight = 0;
    const articles = timeline.querySelectorAll<HTMLElement>(
      "#timeline > article"
    );
    for (const article of Array.from(articles)) {
      article.classList.remove("left");
      article.classList.remove("right");
      if (leftColumnHeight - rightColumnHeight > 5) {
        article.classList.add("right");
        rightColumnHeight += article.offsetHeight;
      } else {
        article.classList.add("left");
        leftColumnHeight += article.offsetHeight;
      }
    }
  }
}

const getData = async (
  disciplines?: string[],
  { from, to }: { from?: Date; to?: Date } | undefined = {}
) => {
  const DB = (await dbConnect()).connection.db;

  // Io is the only user in the database,
  const user = await User.findOne();
  let topLoggerUser: TopLogger.User | null = null;
  try {
    topLoggerUser = user?.topLoggerId
      ? await fetchUser(user.topLoggerId)
      : null;
  } catch (e) {
    /* */
  }
  const topLoggerUserId = topLoggerUser?.id;

  const eventsPromises: (Promise<EventEntry> | EventEntry)[] = [];

  if (disciplines?.includes("bouldering") || !disciplines?.length) {
    eventsPromises.push(
      ...ioClimbAlongEventsWithIds.map(([eventId, ioId]) =>
        getIoClimbAlongCompetitionEventEntry(eventId, ioId)
      ),
      ...(topLoggerUserId
        ? await DB.collection<Omit<TopLogger.GroupUserMultiple, "user">>(
            "toplogger_group_users"
          )
            .find({ user_id: topLoggerUserId })
            .toArray()
        : []
      ).map(({ group_id, user_id }) =>
        getTopLoggerGroupEventEntry(group_id, user_id)
      )
    );
  }
  if (disciplines?.includes("running") || !disciplines?.length) {
    eventsPromises.push(
      ...ioSportsTimingEventsWithIds.map(([eventId, ioId]) =>
        getSportsTimingEventEntry(eventId, ioId)
      )
    );
  }
  if (disciplines?.includes("metal") || !disciplines?.length) {
    eventsPromises.push(...(await getSongkickEvents()));
  }

  return (await Promise.all(eventsPromises))
    .filter((event) => {
      if (from && isBefore(event.end, from)) return false;

      if (to && isAfter(event.start, to)) return false;

      return true;
    })
    .sort((a, b) => differenceInMilliseconds(b.start, a.start));
};
