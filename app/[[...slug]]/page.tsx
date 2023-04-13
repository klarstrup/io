import Script from "next/script";
import { getIoClimbAlongCompetitionEvent } from "../../climbalong";
import dbConnect from "../../dbConnect";
import { getSongkickEvents } from "../../songkick";
import { getSportsTimingEventResults } from "../../sportstiming";
import { getGroupsUsers, getIoTopLoggerGroupEvent } from "../../toplogger";
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
            let training: unknown[] | null = null;
            if (nextEvent) {
              const trainingPeriod: Interval = {
                start: event.start,
                end: nextEvent.start,
              };
              training = await getTrainingData(trainingPeriod);
            }
            return (
              <>
                {training?.length ? (
                  <article
                    key={String(event.start)}
                    className={!(i++ % 2) ? "left" : "right"}
                  >
                    <div className="content" style={{ padding: 0 }}>
                      <pre>{JSON.stringify(training, null, 2)}</pre>
                    </div>
                  </article>
                ) : null}
                <article
                  key={String(event.start)}
                  className={!(i++ % 2) ? "left" : "right"}
                >
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

const getTrainingData = async (trainingInterval: Interval) => {
  return await Promise.all([].filter(() => trainingInterval));
};

const getData = async (disciplines?: string[]) => {
  await dbConnect();
  /*
  const activities = await dbFetch<Fitocracy.UserActivity[]>(
    "https://www.fitocracy.com/get_user_activities/528455/",
    { headers: { cookie: "sessionid=blahblahblah;" } }
  );
  const activityHistories = await Promise.all(
    activities.map((activity) =>
      dbFetch(
        `https://www.fitocracy.com/_get_activity_history_json/?activity-id=${activity.id}`,
        { headers: { cookie: "sessionid=blahblahblah;" } }
      )
    )
  );
    */
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
        (await getGroupsUsers({ filters: { user_id: 176390 } })).map(
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
