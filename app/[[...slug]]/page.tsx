/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  Interval,
  differenceInMilliseconds,
  isAfter,
  isBefore,
  isFuture,
  isPast,
  max,
  min,
  startOfMonth,
} from "date-fns";
import Script from "next/script";
import { Fragment } from "react";
import dbConnect from "../../dbConnect";
import type { EventEntry } from "../../lib";
import { User } from "../../models/user";
import { getIoClimbAlongCompetitionEventEntry } from "../../sources/climbalong";
import { getLiftingTrainingData } from "../../sources/fitocracy";
import { getRunningTrainingData } from "../../sources/rundouble";
import { getSongkickEvents } from "../../sources/songkick";
import { getSportsTimingEventEntry } from "../../sources/sportstiming";
import {
  TopLogger,
  getBoulderingTrainingData,
  getGroupsUsers,
  getTopLoggerGroupEventEntry,
  getUser,
} from "../../sources/toplogger";
import { HOUR_IN_SECONDS, cotemporality } from "../../utils";
import "../page.css";
import { LoadPreviousMonthWhenYouSeeThisAlright } from "./LoadNextMonthWhenYouSeeThisAlright";
import TimelineEventContent from "./TimelineEventContent";
import TimelineTrainingContent from "./TimelineTrainingContent";
import UserStuff from "./UserStuff";

/*
export function generateStaticParams() {
  return ["", "index", "bouldering", "running", "metal"].map((slug) => ({
    slug: slug ? [slug] : undefined,
  }));
}
*/

async function TimelineTrainingArticle({
  from,
  to,
  urlDisciplines,
}: {
  from: Date;
  to: Date;
  urlDisciplines: string[] | undefined;
}) {
  const trainings: Awaited<ReturnType<typeof getTrainingData>> = (
    await getTrainingData(
      { start: min([from, to]), end: max([from, to]) },
      urlDisciplines
    )
  ).filter(({ count }) => count);

  return trainings.length ? (
    <article>
      <div className="content" style={{ padding: "7px 10px" }}>
        <div style={{ fontSize: "0.75em", marginBottom: "1px" }}>
          <b>Training</b>
        </div>
        <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
          {trainings.map((training) => (
            <TimelineTrainingContent
              key={training.type + training.discipline}
              training={training}
              urlDisciplines={urlDisciplines}
            />
          ))}
        </div>
      </div>
    </article>
  ) : null;
}

export default async function Home({
  params: { slug: [disciplinesString] = [] },
  searchParams,
}: {
  params: { slug?: string[] };
  searchParams: { [key: string]: string };
}) {
  const now = new Date();
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
        {events.map((event, j) => {
          const nextEvent = events[j - 1];

          return (
            <Fragment key={event.id}>
              {(!nextEvent || isFuture(nextEvent.start)) &&
              isPast(event.start) ? (
                (searchParams.to && isPast(new Date(searchParams.to))) ||
                (searchParams.from &&
                  isFuture(new Date(searchParams.from))) ? null : (
                  <article className="now">
                    <div className="content">
                      You are <b>now</b>
                    </div>
                  </article>
                )
              ) : null}
              <TimelineTrainingArticle
                from={event.end}
                to={nextEvent?.start || now}
                urlDisciplines={urlDisciplines}
              />
              <article>
                <div className={`content ${cotemporality(event)}`}>
                  {event.source ? (
                    <TimelineEventContent
                      eventEntry={event}
                      urlDisciplines={urlDisciplines}
                    />
                  ) : null}
                </div>
              </article>
            </Fragment>
          );
        })}
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

const getTrainingData = async (
  trainingInterval: Interval,
  disciplines?: string[]
) => {
  await dbConnect();
  return [
    disciplines?.includes("bouldering")
      ? await getBoulderingTrainingData(trainingInterval)
      : null,
    disciplines?.includes("running")
      ? await getRunningTrainingData(trainingInterval)
      : null,
    disciplines?.includes("bouldering") || disciplines?.includes("running")
      ? await getLiftingTrainingData(trainingInterval)
      : null,
  ].filter(Boolean);
};

const getData = async (
  disciplines?: string[],
  { from, to }: { from?: Date; to?: Date } | undefined = {}
) => {
  await dbConnect();

  // Io is the only user in the database,
  const user = await User.findOne();
  let topLoggerUser: TopLogger.UserSingle | null = null;
  try {
    topLoggerUser = user?.topLoggerId ? await getUser(user.topLoggerId) : null;
  } catch (e) {
    /* */
  }
  const topLoggerUserId = topLoggerUser?.id;

  const eventsPromises: (Promise<EventEntry> | EventEntry)[] = [];

  if (disciplines?.includes("bouldering") || !disciplines?.length) {
    eventsPromises.push(
      getIoClimbAlongCompetitionEventEntry(13, 844),
      getIoClimbAlongCompetitionEventEntry(20, 1284),
      getIoClimbAlongCompetitionEventEntry(26, 3381),
      getIoClimbAlongCompetitionEventEntry(27, 8468),
      getIoClimbAlongCompetitionEventEntry(28, 10770),
      getIoClimbAlongCompetitionEventEntry(30, 11951),
      getIoClimbAlongCompetitionEventEntry(32, 12091),
      getIoClimbAlongCompetitionEventEntry(33, 12477),
      getIoClimbAlongCompetitionEventEntry(34),
      ...(topLoggerUserId
        ? await getGroupsUsers(
            { filters: { user_id: topLoggerUserId } },
            { maxAge: HOUR_IN_SECONDS }
          )
        : []
      ).map(({ group_id, user_id }) =>
        getTopLoggerGroupEventEntry(group_id, user_id)
      )
    );
  }
  if (disciplines?.includes("running") || !disciplines?.length) {
    eventsPromises.push(
      getSportsTimingEventEntry(12576, 5298030),
      getSportsTimingEventEntry(11107, 5177996),
      getSportsTimingEventEntry(10694, 5096890),
      getSportsTimingEventEntry(8962, 4433356),
      getSportsTimingEventEntry(8940, 3999953),
      getSportsTimingEventEntry(7913, 3825124),
      getSportsTimingEventEntry(5805, 2697593),
      getSportsTimingEventEntry(5647, 2619935),
      getSportsTimingEventEntry(4923, 2047175)
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
