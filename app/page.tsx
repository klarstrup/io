import Script from "next/script";
import { getIoClimbAlongCompetitionEvent } from "../climbalong";
import TimelineEventContent from "../components/TimelineEventContent";
import dbConnect from "../dbConnect";
import { getSongkickEvents } from "../songkick";
import { getSportsTimingEventResults } from "../sportstiming";
import { getGroupsUsers, getIoTopLoggerGroupEvent } from "../toplogger";
import "./page.css";

export default async function Home() {
  const ioPercentiles = await getData();

  return (
    <div>
      <section id="timeline">
        {ioPercentiles
          .filter((event) => event.start > new Date())
          .map((event, i) => (
            <article
              key={String(event.start)}
              className={!(i % 2) ? "left" : "right"}
            >
              <div className="content" style={{ opacity: 0.5 }}>
                <TimelineEventContent event={event} />
              </div>
            </article>
          ))}
      </section>
      <hr
        style={{
          margin: 0,
          borderColor: "#ff0",
          borderStyle: "dashed",
          borderWidth: "3px",
        }}
      />
      <section id="timeline">
        {ioPercentiles
          .filter((event) => event.start <= new Date())
          .map((event, i) => (
            <article
              key={String(event.start)}
              className={!(i % 2) ? "left" : "right"}
            >
              <div className="content">
                <TimelineEventContent event={event} />
              </div>
            </article>
          ))}
      </section>
      <Script id="balanceColumns">
        {`${String(
          balanceColumns
        )};window.addEventListener("resize",balanceColumns);balanceColumns();`}
      </Script>
    </div>
  );
}

function balanceColumns() {
  let leftColumnHeight = 0;
  let rightColumnHeight = 100;
  const articles = document.querySelectorAll<HTMLElement>("#timeline article");
  for (const article of Array.from(articles)) {
    article.classList.remove("left");
    article.classList.remove("right");
    if (leftColumnHeight > rightColumnHeight) {
      article.classList.add("right");
      rightColumnHeight += article.offsetHeight;
    } else {
      article.classList.add("left");
      leftColumnHeight += article.offsetHeight;
    }
  }
}

const getData = async () => {
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

  return (
    await Promise.all(
      [
        getSportsTimingEventResults(10694, 5096890, true),
        getSportsTimingEventResults(8962, 4433356, true),
        getSportsTimingEventResults(8940, 3999953, true),
        getSportsTimingEventResults(7913, 3825124, true),
        getSportsTimingEventResults(5805, 2697593, true),
        getSportsTimingEventResults(5647, 2619935, true),
        getSportsTimingEventResults(4923, 2047175, true),
        getIoClimbAlongCompetitionEvent(13, 844, sex),
        getIoClimbAlongCompetitionEvent(20, 1284, sex),
        getIoClimbAlongCompetitionEvent(26, 3381, sex),
        getIoClimbAlongCompetitionEvent(27, 8468, sex),
        getIoClimbAlongCompetitionEvent(28, undefined, sex),
        (
          await getGroupsUsers({ filters: { user_id: 176390 } })
        ).map(({ group_id, user_id }) =>
          getIoTopLoggerGroupEvent(group_id, user_id, sex)
        ),
        ...(await getSongkickEvents()),
      ].flat()
    )
  ).sort((a, b) => Number(b.start) - Number(a.start));
};
