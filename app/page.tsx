import { getIoPercentileForClimbalongCompetition } from "../climbalong";
import dbConnect from "../dbConnect";
import { getSportsTimingEventResults } from "../sportstiming";
import { getGroupsUsers, getIoPercentileForTopLoggerGroup } from "../toplogger";
import "./page.css";

function RankBadge({
  scoring,
}: {
  scoring:
    | Awaited<ReturnType<typeof getData>>[number]["officialScoring"]
    | Awaited<ReturnType<typeof getData>>[number]["pointsScoring"]
    | Awaited<ReturnType<typeof getData>>[number]["topsAndZonesScoring"]
    | Awaited<ReturnType<typeof getData>>[number]["thousandDividedByScoring"];
}) {
  if (!scoring) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-around",
        minWidth: "100px",
        fontSize: "1.2em",
      }}
    >
      <b>
        <small>#</small>
        {scoring.rank}
      </b>
      <b>{scoring.percentile}</b>
    </div>
  );
}

const ResultList = ({ data }: { data: [string, string | number][] }) => (
  <dl>
    {data.map(([label, data]) => (
      <div key={label}>
        <dt>{label}</dt>
        <dd>{data}</dd>
      </div>
    ))}
  </dl>
);

const FlashBadge = () => (
  <svg fill="none" preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 116">
    <rect
      width="50"
      stroke="#ffff00"
      y="4"
      x="4"
      fill="#c84821"
      height="108"
      strokeWidth="8"
    ></rect>
  </svg>
);
const TopBadge = () => (
  <svg fill="none" preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 116">
    <rect
      width="50"
      stroke="#c84821"
      y="4"
      x="4"
      fill="#c84821"
      height="108"
      strokeWidth="8"
    ></rect>
  </svg>
);
const ZoneBadge = () => (
  <svg fill="none" preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 116">
    <rect
      width="50"
      stroke="#c84821"
      y="4"
      x="4"
      fill="none"
      height="108"
      strokeWidth="8"
    ></rect>
    <rect
      fill="#c84821"
      transform="translate(58,116) rotate(180)"
      width="58"
      height="58"
    ></rect>
  </svg>
);
const NoSendBadge = () => (
  <svg fill="none" preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 116">
    <rect
      width="50"
      stroke="#c84821"
      y="4"
      x="4"
      fill="none"
      height="108"
      strokeWidth="8"
    ></rect>
    <rect
      fill="#c84821"
      transform="translate(58,116) rotate(180)"
      width="58"
      height="0"
    ></rect>
  </svg>
);

function EventContent({
  event: {
    start,
    end,
    venue,
    event,
    officialScoring,
    topsAndZonesScoring,
    thousandDividedByScoring,
    pointsScoring,
    noParticipants,
    problems,
    problemByProblem,
    category,
    ...e
  },
}: {
  event: Awaited<ReturnType<typeof getData>>[number];
}) {
  return (
    <>
      <small>
        <b>
          {new Intl.DateTimeFormat("en-DK", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Europe/Copenhagen",
          }).formatRange(start, end)}
        </b>
        {venue ? (
          <>
            {" "}
            at <b>{venue}</b>
          </>
        ) : (
          ""
        )}
      </small>
      <h2 style={{ margin: 0 }}>{event}</h2>
      <small>
        {problems ? <b>{problems} problems</b> : null}
        {problems && noParticipants ? <> between </> : null}
        {noParticipants ? <b>{noParticipants} participants</b> : null}
        {noParticipants && category ? <> in the </> : null}
        {category ? (
          <b>{category === "male" ? "M" : category} bracket</b>
        ) : null}
      </small>
      <hr />
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {officialScoring ? (
          <fieldset>
            <legend>Official Scoring</legend>
            <RankBadge scoring={officialScoring} />
            <hr />
            <ResultList
              data={
                [
                  "score" in officialScoring && [
                    "Score",
                    officialScoring.score,
                  ],
                  "duration" in officialScoring && [
                    "Duration",
                    seconds2time(officialScoring.duration),
                  ],
                  "duration" in officialScoring && [
                    "Distance",
                    (officialScoring.distance / 1000).toLocaleString("en-DK", {
                      unit: "kilometer",
                    }) + " km",
                  ],
                ].filter(Boolean) as any
              }
            />
          </fieldset>
        ) : null}
        {topsAndZonesScoring && (
          <fieldset>
            <legend>Tops & Zones Scoring</legend>
            <RankBadge scoring={topsAndZonesScoring} />
            <hr />
            <ResultList
              data={[
                ["T", topsAndZonesScoring.tops],
                ["Z", topsAndZonesScoring.zones],
                ["aT", topsAndZonesScoring.topsAttempts],
                ["aZ", topsAndZonesScoring.zonesAttempts],
              ]}
            />
          </fieldset>
        )}
        {thousandDividedByScoring && (
          <fieldset>
            <legend title="Each top grants 1000 points divided by the number of climbers who have topped it. 10% flash bonus.">
              1000 / Tops Scoring
            </legend>
            <RankBadge scoring={thousandDividedByScoring} />
            <hr />
            <ResultList
              data={
                thousandDividedByScoring.zonesScore
                  ? [
                      ["Top Pts", thousandDividedByScoring.topsScore],
                      ["Zone Pts", thousandDividedByScoring.zonesScore],
                    ]
                  : [["Points", thousandDividedByScoring.topsScore]]
              }
            />
          </fieldset>
        )}
        {pointsScoring && (
          <fieldset>
            <legend title="100 per top, 20 per zone">Points Scoring</legend>
            <RankBadge scoring={pointsScoring} />
            <hr />
            <ResultList data={[["Points", pointsScoring.points]]} />
          </fieldset>
        )}
      </div>
      <div style={{ display: "flex", marginTop: "5px" }}>
        {problemByProblem
          ? problemByProblem.map(({ number, flash, top, zone }) => (
              <div
                style={{ flex: 1, margin: "1px" }}
                key={number}
                title={`${number}: ${
                  flash ? "flash" : top ? "top" : zone ? "zone" : "no send"
                }`}
              >
                {flash ? (
                  <FlashBadge />
                ) : top ? (
                  <TopBadge />
                ) : zone ? (
                  <ZoneBadge />
                ) : (
                  <NoSendBadge />
                )}
              </div>
            ))
          : null}
      </div>
      {Object.keys(e).length ? <pre>{JSON.stringify(e, null, 2)}</pre> : null}
    </>
  );
}

export default async function Home() {
  const ioPercentiles = await getData();

  return (
    <div>
      <section id="timeline">
        {ioPercentiles
          .filter(({ noParticipants }) => noParticipants)
          .map((event, i) => (
            <article
              key={String(event.start)}
              className={!(i % 2) ? "left" : "right"}
            >
              <div className="content">
                <EventContent event={event} />
              </div>
            </article>
          ))}
      </section>
    </div>
  );
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
        getIoPercentileForClimbalongCompetition(13, 844, sex),
        getIoPercentileForClimbalongCompetition(20, 1284, sex),
        getIoPercentileForClimbalongCompetition(26, 3381, sex),
        getIoPercentileForClimbalongCompetition(27, 8468, sex),
        getIoPercentileForClimbalongCompetition(28, undefined, sex),
        (
          await getGroupsUsers({ filters: { user_id: 176390 } })
        ).map(({ group_id, user_id }) =>
          getIoPercentileForTopLoggerGroup(group_id, user_id, sex)
        ),
      ].flat()
    )
  ).sort((a, b) => Number(b.start) - Number(a.start));
};

function seconds2time(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds - hours * 3600) / 60);
  seconds = seconds - hours * 3600 - minutes * 60;

  return `${hours || "0"}:${minutes < 10 ? "0" + minutes : String(minutes)}:${
    seconds < 10 ? "0" + seconds : String(seconds)
  }`;
}
