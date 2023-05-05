import {
  Interval,
  isBefore,
  isFuture,
  isPast,
  isWithinInterval,
} from "date-fns";
import Script from "next/script";
import dbConnect from "../../dbConnect";
import { getIoClimbAlongCompetitionEvent } from "../../sources/climbalong";
import { getLiftingTrainingData } from "../../sources/fitocracy";
import { getRunningTrainingData } from "../../sources/rundouble";
import { getSongkickEvents } from "../../sources/songkick";
import { getSportsTimingEventResults } from "../../sources/sportstiming";
import {
  IO_TOPLOGGER_ID,
  getBoulderingTrainingData,
  getGroupsUsers,
  getIoTopLoggerGroupEvent,
} from "../../sources/toplogger";
import "../page.css";
import TimelineEventContent from "./TimelineEventContent";
import TimelineTrainingContent from "./TimelineTrainingContent";

export default async function Home({
  params: { slug: [disciplinesString] = [] },
}: {
  params: { slug?: string[] };
}) {
  const urlDisciplines: string[] | undefined =
    (disciplinesString !== "index" &&
      (disciplinesString as string | undefined)?.split("+")) ||
    undefined;
  const ioEvents = await getData(urlDisciplines);

  let i = 0;
  return (
    <div>
      <section id="timeline">
        {await Promise.all(
          ioEvents.map(async (event, j) => {
            const nextEvent = ioEvents[j - 1];

            const now = new Date();
            const eventInterval: Interval = {
              start: new Date(event.start),
              end: new Date(event.end),
            };
            const trainings: Awaited<ReturnType<typeof getTrainingData>> = (
              nextEvent
                ? await getTrainingData(
                    {
                      start: new Date(event.end),
                      end: new Date(nextEvent.start),
                    },
                    urlDisciplines
                  )
                : []
            ).filter(({ count }) => count);

            const side = !(i++ % 2) ? "left" : "right";
            return (
              <>
                {(!nextEvent || isFuture(nextEvent.start)) &&
                isPast(event.start) ? (
                  <article
                    key="you"
                    className={"now " + (!(i++ % 2) ? "left" : "right")}
                  >
                    <div className="content">
                      You are <b>now</b>
                    </div>
                  </article>
                ) : null}
                {trainings.length ? (
                  <article
                    key={String(event.start) + String(now)}
                    className={side}
                  >
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
                ) : null}
                <article key={String(event.start)} className={side}>
                  <div
                    className={`content ${
                      isWithinInterval(new Date(), eventInterval)
                        ? "current"
                        : isBefore(new Date(), eventInterval.start)
                        ? "future"
                        : "past"
                    }`}
                  >
                    <TimelineEventContent
                      event={event}
                      urlDisciplines={urlDisciplines}
                    />
                  </div>
                </article>
              </>
            );
          })
        )}
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
  const sex = true;

  const eventsPromises: (
    | ReturnType<
        | typeof getSportsTimingEventResults
        | typeof getIoClimbAlongCompetitionEvent
        | typeof getIoTopLoggerGroupEvent
      >
    | Awaited<ReturnType<typeof getSongkickEvents>>[number]
  )[] = [];

  if (disciplines?.includes("bouldering") || !disciplines?.length) {
    eventsPromises.push(
      ...[
        getIoClimbAlongCompetitionEvent(13, 844, sex),
        getIoClimbAlongCompetitionEvent(20, 1284, sex),
        getIoClimbAlongCompetitionEvent(26, 3381, sex),
        getIoClimbAlongCompetitionEvent(27, 8468, sex),
        getIoClimbAlongCompetitionEvent(28, 10770, sex),
        (await getGroupsUsers({ filters: { user_id: IO_TOPLOGGER_ID } })).map(
          ({ group_id, user_id }) =>
            getIoTopLoggerGroupEvent(group_id, user_id, sex)
        ),
      ].flat()
    );
  }
  if (disciplines?.includes("running") || !disciplines?.length) {
    eventsPromises.push(
      ...[
        getSportsTimingEventResults(10694, 5096890, true),
        getSportsTimingEventResults(8962, 4433356, true),
        getSportsTimingEventResults(8940, 3999953, true),
        getSportsTimingEventResults(7913, 3825124, true),
        getSportsTimingEventResults(5805, 2697593, true),
        getSportsTimingEventResults(5647, 2619935, true),
        getSportsTimingEventResults(4923, 2047175, true),
      ]
    );
  }
  if (disciplines?.includes("metal") || !disciplines?.length) {
    eventsPromises.push(...(await getSongkickEvents()));
  }

  return (await Promise.all(eventsPromises)).sort(
    (a, b) => Number(b.start) - Number(a.start)
  );
};
