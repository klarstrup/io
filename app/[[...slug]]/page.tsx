import {
  differenceInMilliseconds,
  isAfter,
  isBefore,
  isWithinInterval,
  subMonths,
} from "date-fns";
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
import LoadMore from "./LoadMore";
import { TimelineEventsList } from "./TimelineEventsList";
import UserStuff from "./UserStuff";

const monthsPerPage = 2;

export default async function Home({
  params: { slug: [disciplinesString] = [] },
}: {
  params: { slug?: string[] };
}) {
  const disciplines: string[] | undefined =
    (disciplinesString !== "index" &&
      (disciplinesString as string | undefined)?.split("+")) ||
    undefined;
  const from = subMonths(new Date(), monthsPerPage);
  const to = undefined;
  const events = await getData(disciplines, { from, to });

  const initialCursor = JSON.stringify({
    disciplines,
    from: subMonths(from, monthsPerPage),
    to: from,
  });

  return (
    <div>
      <UserStuff />
      <section id="timeline">
        <LoadMore loadMoreAction={loadMoreData} initialCursor={initialCursor}>
          <TimelineEventsList
            events={events}
            disciplines={disciplines}
            from={from}
            to={to}
          />
        </LoadMore>
      </section>
    </div>
  );
}

async function loadMoreData(cursor: string) {
  "use server";

  const { disciplines, from, to } = JSON.parse(cursor) as {
    disciplines?: string[];
    from?: Date;
    to?: Date;
  };

  const isAtLimit = isAfter(new Date(2013, 9), to || from || new Date());

  if (isAtLimit) return [null, null] as const;

  const events = await getData(disciplines, { from, to });

  return [
    <TimelineEventsList
      from={from}
      to={to}
      disciplines={disciplines}
      events={events}
      key={JSON.stringify({ disciplines, from, to })}
    />,
    JSON.stringify({
      disciplines,
      from: subMonths(from!, monthsPerPage),
      to: from,
    }),
  ] as const;
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
      const eventCenter = new Date(
        (event.start.getTime() + event.end.getTime()) / 2
      );

      if (from && to) {
        return isWithinInterval(eventCenter, { start: from, end: to });
      }

      if (from && isBefore(eventCenter, from)) return false;

      if (to && isAfter(eventCenter, to)) return false;

      return true;
    })
    .sort((a, b) => differenceInMilliseconds(b.start, a.start));
};
