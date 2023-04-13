import Link from "next/link";
import Script from "next/script";
import { getIoClimbAlongCompetitionEvent } from "../../climbalong";
import dbConnect from "../../dbConnect";
import { IO_FITOCRACY_ID, getUserActivityLogs } from "../../fitocracy";
import { IO_RUNDOUBLE_ID, getRuns } from "../../rundouble";
import { getSongkickEvents } from "../../songkick";
import { getSportsTimingEventResults } from "../../sportstiming";
import {
  IO_TOPLOGGER_ID,
  getAscends,
  getGroupsUsers,
  getIoTopLoggerGroupEvent,
} from "../../toplogger";
import "../page.css";
import TimelineEventContent from "./TimelineEventContent";

export function generateStaticParams() {
  return ["", "index", "bouldering", "running", "metal"].map((slug) => ({
    slug: slug ? [slug] : undefined,
  }));
}

interface Interval {
  start: Date;
  end: Date;
}

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
  const ioEventsFilteredByDiscipline = ioEvents.filter((event) =>
    urlDisciplines?.length
      ? urlDisciplines.includes(event.discipline.toLowerCase())
      : true
  );
  const futureIoEvents = ioEventsFilteredByDiscipline.filter(
    (event) => event.start > new Date()
  );
  const pastIoEvents = ioEventsFilteredByDiscipline.filter(
    (event) => event.start <= new Date()
  );
  let i = 0;
  return (
    <div>
      <section id="timeline">
        {futureIoEvents.map((event) => (
          <article
            key={String(event.start)}
            className={!(i++ % 2) ? "left" : "right"}
          >
            <div className="content" style={{ opacity: 0.5 }}>
              <TimelineEventContent
                event={event}
                urlDisciplines={urlDisciplines}
              />
            </div>
          </article>
        ))}
        <article key="you" className={"now " + (!(i++ % 2) ? "left" : "right")}>
          <div className="content">
            You are <b>now</b>
          </div>
        </article>
        {await Promise.all(
          pastIoEvents.map(async (event, j) => {
            const nextEvent =
              ioEventsFilteredByDiscipline[futureIoEvents.length + j - 1];
            let training: Awaited<ReturnType<typeof getTrainingData>> | null =
              null;
            const now = new Date();
            const trainingPeriod: Interval = {
              start: event.end,
              end: nextEvent.start || now,
            };
            training = (
              await getTrainingData(trainingPeriod, urlDisciplines)
            ).filter(({ count }) => count);

            const side = !(i++ % 2) ? "left" : "right";
            return (
              <>
                {training?.length ? (
                  <article
                    key={String(event.start) + String(now)}
                    className={side}
                  >
                    <div className="content" style={{ padding: "7px 10px" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          fontSize: "1.25em",
                        }}
                      >
                        {training.map(({ type, discipline, count }) => (
                          <span key={discipline}>
                            <Link
                              title={`${discipline} ${type}`}
                              href={
                                urlDisciplines?.includes(discipline)
                                  ? "/"
                                  : `/${discipline}`
                              }
                              style={{
                                textDecoration: "none",
                                cursor: "pointer",
                              }}
                            >
                              {discipline === "bouldering"
                                ? `🧗‍♀️`
                                : discipline === "lifting"
                                ? `🏋️‍♀️`
                                : discipline === "running"
                                ? `🏃‍♀️`
                                : null}
                            </Link>
                            {discipline === "bouldering"
                              ? `×${count}`
                              : discipline === "lifting"
                              ? ` ${count}kg`
                              : discipline === "running"
                              ? ` ${count}km`
                              : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                ) : null}
                <article key={String(event.start)} className={side}>
                  <div className="content">
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
      <Script id={String(new Date())}>
        {`${String(
          balanceColumns
        )};window.addEventListener("resize",balanceColumns);balanceColumns();setTimeout(()=>balanceColumns(),200);setTimeout(()=>balanceColumns(),400);setTimeout(()=>balanceColumns(),600);`}
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
    !disciplines || disciplines.includes("bouldering")
      ? {
          type: "training",
          discipline: "bouldering",
          count: (
            await getAscends(
              { filters: { user_id: IO_TOPLOGGER_ID } },
              { maxAge: 86400 }
            )
          ).filter((ascend) => {
            const date = ascend.date_logged && new Date(ascend.date_logged);
            return (
              Number(date) < Number(trainingInterval.end) &&
              Number(date) > Number(trainingInterval.start)
            );
          }).length,
        }
      : null,
    !disciplines || disciplines.includes("running")
      ? {
          type: "training",
          discipline: "running",
          count: Math.round(
            (await getRuns(IO_RUNDOUBLE_ID))
              .filter((run) => {
                const date = run.completedLong && new Date(run.completedLong);
                return (
                  Number(date) < Number(trainingInterval.end) &&
                  Number(date) > Number(trainingInterval.start)
                );
              })
              .reduce((sum, run) => run.runDistance + sum, 0) / 1000
          ),
        }
      : null,
    !disciplines || disciplines.includes("lifting")
      ? {
          type: "training",
          discipline: "lifting",
          count: Math.round(
            (await getUserActivityLogs(IO_FITOCRACY_ID, { maxAge: 86400 }))
              .filter((actionSet) => {
                return actionSet.actions.some(({ actiondate }) => {
                  const date = actiondate && new Date(actiondate);
                  return (
                    Number(date) < Number(trainingInterval.end) &&
                    Number(date) > Number(trainingInterval.start)
                  );
                });
              })
              .reduce(
                (sum, { actions }) =>
                  sum +
                  actions.reduce(
                    (zum, action) =>
                      action.effort0_unit?.abbr === "kg" &&
                      action.effort1_unit.abbr === "reps"
                        ? action.effort0_metric * action.effort1_metric + zum
                        : zum,
                    0
                  ),
                0
              )
          ),
        }
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
        getIoClimbAlongCompetitionEvent(28, undefined, sex),
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
