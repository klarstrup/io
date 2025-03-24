import {
  differenceInMilliseconds,
  isAfter,
  isBefore,
  isWithinInterval,
  subMonths,
} from "date-fns";
import LoadMore from "../../components/LoadMore";
import UserStuff from "../../components/UserStuff";
import type { EventEntry } from "../../lib";
import { Users } from "../../models/user.server";
import {
  getIoClimbAlongCompetitionEventEntry,
  ioClimbAlongEventsWithIds,
} from "../../sources/climbalong";
import { getIoOnsightCompetitionEventEntries } from "../../sources/onsight";
import { getSongkickEvents } from "../../sources/songkick";
import {
  getSportsTimingEventEntry,
  ioSportsTimingEventsWithIds,
} from "../../sources/sportstiming";
import { getTopLoggerCompEventEntry } from "../../sources/toplogger";
import { DataSource } from "../../sources/utils";
import { isNonEmptyArray } from "../../utils";
import { TopLoggerGraphQL } from "../../utils/graphql";
import type { CompUser } from "../api/toplogger_scrape/route";
import "../page.css";
import { TimelineEventsList } from "./TimelineEventsList";

const monthsPerPage = 2;

export default async function Home(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug: [disciplinesString] = [] } = await props.params;

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
  { from, to }: { from?: Date; to?: Date } | undefined = {},
) => {
  const user = await Users.findOne();

  const eventsPromises: (Promise<EventEntry> | EventEntry)[] = [];

  const noDisciplines = !isNonEmptyArray(disciplines);
  if (noDisciplines || disciplines?.includes("bouldering")) {
    eventsPromises.push(
      ...(await getIoOnsightCompetitionEventEntries()),
      ...ioClimbAlongEventsWithIds.map(([eventId, ioId]) =>
        getIoClimbAlongCompetitionEventEntry(eventId, ioId),
      ),
      ...(user?.dataSources?.some(
        (source) => source.source === DataSource.TopLogger,
      )
        ? await TopLoggerGraphQL.find<CompUser>({
            userId: {
              $in: user?.dataSources
                ?.filter((source) => source.source === DataSource.TopLogger)
                .map((source) => source.config.graphQLId),
            },
            __typename: "CompUser",
          }).toArray()
        : []
      ).map((compUser) =>
        getTopLoggerCompEventEntry(compUser.compId, compUser.userId),
      ),
    );
  }
  if (noDisciplines || disciplines?.includes("running")) {
    eventsPromises.push(
      ...ioSportsTimingEventsWithIds.map(([eventId, ioId]) =>
        getSportsTimingEventEntry(eventId, ioId),
      ),
    );
  }
  if (noDisciplines || disciplines?.includes("metal")) {
    eventsPromises.push(...(await getSongkickEvents()));
  }

  return (await Promise.all(eventsPromises))
    .filter((event) => {
      const eventCenter = new Date(
        (event.start.getTime() + event.end.getTime()) / 2,
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
