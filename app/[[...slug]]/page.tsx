/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  Interval,
  differenceInMilliseconds,
  isFuture,
  isPast,
  max,
  min,
} from "date-fns";
import Script from "next/script";
import { Fragment } from "react";
import dbConnect from "../../dbConnect";
import type { EventEntry } from "../../lib";
import { getIoClimbAlongCompetitionEventEntry } from "../../sources/climbalong";
import { getLiftingTrainingData } from "../../sources/fitocracy";
import { getRunningTrainingData } from "../../sources/rundouble";
import { getSongkickEvents } from "../../sources/songkick";
import { getSportsTimingEventEntry } from "../../sources/sportstiming";
import {
  IO_TOPLOGGER_ID,
  getBoulderingTrainingData,
  getGroupsUsers,
  getIoTopLoggerGroupEventEntry,
} from "../../sources/toplogger";
import { cotemporality } from "../../utils";
import "../page.css";
import TimelineEventContent from "./TimelineEventContent";
import TimelineTrainingContent from "./TimelineTrainingContent";

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
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexDirection: "column",
            fontSize: "1.25em",
          }}
        >
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
}: {
  params: { slug?: string[] };
}) {
  const now = new Date();
  const urlDisciplines: string[] | undefined =
    (disciplinesString !== "index" &&
      (disciplinesString as string | undefined)?.split("+")) ||
    undefined;
  const events = await getData(urlDisciplines);

  return (
    <div>
      <section id="timeline">
        {events.map((event, j) => {
          const nextEvent = events[j - 1];

          return (
            <Fragment key={event.id}>
              {(!nextEvent || isFuture(nextEvent.start)) &&
              isPast(event.start) ? (
                <article className="now">
                  <div className="content">
                    You are <b>now</b>
                  </div>
                </article>
              ) : null}
              {urlDisciplines?.length ? (
                <TimelineTrainingArticle
                  from={event.end}
                  to={nextEvent?.start || now}
                  urlDisciplines={urlDisciplines}
                />
              ) : null}
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
      </section>
      <Script key={String(new Date())} id={String(new Date())}>
        {`
        ${String(balanceColumns)};
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

const getData = async (disciplines?: string[]) => {
  await dbConnect();

  const eventsPromises: (Promise<EventEntry> | EventEntry)[] = [];

  if (disciplines?.includes("bouldering") || !disciplines?.length) {
    eventsPromises.push(
      getIoClimbAlongCompetitionEventEntry(13, 844),
      getIoClimbAlongCompetitionEventEntry(20, 1284),
      getIoClimbAlongCompetitionEventEntry(26, 3381),
      getIoClimbAlongCompetitionEventEntry(27, 8468),
      getIoClimbAlongCompetitionEventEntry(28, 10770),
      getIoClimbAlongCompetitionEventEntry(30, 11951),
      ...(await getGroupsUsers({ filters: { user_id: IO_TOPLOGGER_ID } })).map(
        ({ group_id, user_id }) =>
          getIoTopLoggerGroupEventEntry(group_id, user_id)
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

  return Promise.all(eventsPromises).then((events) =>
    events.sort((a, b) => differenceInMilliseconds(b.start, a.start))
  );
};
