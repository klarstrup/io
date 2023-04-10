import { HTMLProps, SVGProps } from "react";
import { getIoPercentileForClimbalongCompetition } from "../climbalong";
import dbConnect from "../dbConnect";
import { SCORING_SOURCE, Score } from "../lib";
import { getSportsTimingEventResults } from "../sportstiming";
import { getGroupsUsers, getIoPercentileForTopLoggerGroup } from "../toplogger";
import "./page.css";

function RankBadge({ score }: { score: Score }) {
  if (!score) return null;

  return (
    <>
      <b style={{ lineHeight: 0.5 }}>
        <small>
          <small>
            <small>#</small>
          </small>
        </small>
        {score.rank}
      </b>
      <span style={{ fontSize: "0.75em" }}>{score.percentile}</span>
    </>
  );
}

const ResultList = ({
  score,
  style,
}: {
  score: Score;
  style?: HTMLProps<HTMLDListElement>["style"];
}) => {
  const data =
    score.system === "DISTANCE_RACE"
      ? [
          [
            "Duration",
            score.duration ? seconds2time(score.duration) : String(NaN),
          ],
          [
            "Distance",
            (score.distance / 1000).toLocaleString("en-DK", {
              unit: "kilometer",
            }) + " km",
          ],
        ]
      : score.system === "POINTS"
      ? [["Points", score.points]]
      : score.system === "THOUSAND_DIVIDE_BY"
      ? [["Points", score.points]]
      : score.system === "TOPS_AND_ZONES"
      ? [
          ["T", score.tops, "Tops"],
          ["Z", score.zones, "Zones"],
          ["aT", score.topsAttempts, "Attempts to achieve top"],
          ["aZ", score.zonesAttempts, "Attempts to achieve zone"],
        ]
      : [];

  return (
    <>
      {data.map(([label, data, title]) => (
        <dl key={label} style={style}>
          <dt
            style={{ fontSize: "0.8em", fontWeight: 700 }}
            title={title ? String(title) : undefined}
          >
            {label}
          </dt>
          <dd style={{ fontSize: "1.1em" }}>{data}</dd>
        </dl>
      ))}
    </>
  );
};

const FlashBadge = ({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) => (
  <svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 58" {...props}>
    <title>{title}</title>
    <rect
      width="50"
      stroke="#c84821"
      y="4"
      x="4"
      fill="#c84821"
      height="50"
      strokeWidth="8"
    ></rect>
    <text
      y="50%"
      x="50%"
      dominantBaseline="central"
      textAnchor="middle"
      fill="#ffff00"
      fontSize="48px"
    >
      ⚡️
    </text>
  </svg>
);
const TopBadge = ({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) => (
  <svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 58" {...props}>
    <title>{title}</title>
    <rect
      width="50"
      stroke="#c84821"
      y="4"
      x="4"
      fill="#c84821"
      height="50"
      strokeWidth="8"
    ></rect>
  </svg>
);
const ZoneBadge = ({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) => (
  <svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 58" {...props}>
    <title>{title}</title>
    <rect
      width="50"
      stroke="#c84821"
      y="4"
      x="4"
      fill="none"
      height="50"
      strokeWidth="8"
    ></rect>
    <rect
      fill="#c84821"
      transform="translate(92,49) rotate(135)"
      width="60"
      height="60"
    ></rect>
  </svg>
);
const AttemptBadge = ({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) => (
  <svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 58" {...props}>
    <title>{title}</title>
    <rect
      width="50"
      stroke="#c84821"
      y="4"
      x="4"
      fill="none"
      height="50"
      strokeWidth="8"
    ></rect>
  </svg>
);
const NoAttemptBadge = ({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) => (
  <svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 58 58" {...props}>
    <title>{title}</title>
    <rect
      width="50"
      stroke="#555"
      y="4"
      x="4"
      fill="none"
      height="50"
      strokeWidth="8"
    ></rect>
  </svg>
);

function EventContent({
  event: {
    start,
    end,
    venue,
    event,
    scores,
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
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Europe/Copenhagen",
          }).formatRange(
            ...([start, end].sort((a, b) => Number(a) - Number(b)) as [
              Date,
              Date
            ])
          )}
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
      <h2 style={{ margin: 0 }}>
        {event
          .replace(
            new RegExp(
              `#${start.toLocaleDateString("da-DK", { month: "long" })}`,
              "i"
            ),
            ""
          )
          .replace(
            `${start.toLocaleDateString("da-DK", { year: "numeric" })}`,
            ""
          )}
      </h2>
      <small>
        {problems ? <b>{problems} problems</b> : null}
        {problems && noParticipants ? <> between </> : null}
        {noParticipants ? <b>{noParticipants} participants</b> : null}
        {noParticipants && category ? <> in the </> : null}
        {category ? (
          <b>{category === "male" ? "M" : category} bracket</b>
        ) : null}
      </small>
      {scores.filter((score) => score.source === SCORING_SOURCE.OFFICIAL)
        .length ? (
        scores
          .filter((score) => score.source === SCORING_SOURCE.OFFICIAL)
          .map((score) => (
            <div
              key={score.system}
              style={{
                display: "grid",
                alignItems: "center",
                gridAutoFlow: "column",
                gridAutoColumns: "max-content",
                gap: "15px",
                minWidth: "100px",
                fontSize: "2.2em",
                marginTop: "0.25em",
              }}
            >
              <RankBadge score={score} />
              <ResultList score={score} style={{ fontSize: "0.6em" }} />
            </div>
          ))
      ) : scores.filter((score) => score.source === SCORING_SOURCE.DERIVED)
          .length ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginTop: "0.25em",
          }}
        >
          {scores
            .filter((score) => score.source === SCORING_SOURCE.DERIVED)
            .map((score) => (
              <fieldset key={score.source + score.system}>
                <legend
                  title={
                    score.system === "POINTS"
                      ? "100 per top, 20 bonus per flash"
                      : score.system === "THOUSAND_DIVIDE_BY"
                      ? "Each top grants 1000 points divided by the number of climbers who have topped it. 10% flash bonus."
                      : undefined
                  }
                >
                  {score.system === "TOPS_AND_ZONES"
                    ? "Tops & Zones"
                    : score.system === "DISTANCE_RACE"
                    ? "Race"
                    : score.system === "POINTS"
                    ? "Points"
                    : score.system === "THOUSAND_DIVIDE_BY"
                    ? "1000 / Tops"
                    : null}{" "}
                  Scoring
                </legend>
                <div
                  key={score.system}
                  style={{
                    display: "grid",
                    alignItems: "center",
                    gridAutoFlow: "column",
                    gridAutoColumns: "max-content",
                    gap: "15px",
                    minWidth: "100px",
                    fontSize: "1.2em",
                  }}
                >
                  <RankBadge score={score} />
                </div>
                <hr />
                <ResultList score={score} />
              </fieldset>
            ))}
        </div>
      ) : null}
      {problemByProblem?.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(15, 1fr)",
            gap: "2px",
            marginTop: "5px",
          }}
        >
          {problemByProblem.map(({ number, flash, top, zone, attempt }) => {
            const Badge = flash
              ? FlashBadge
              : top
              ? TopBadge
              : zone
              ? ZoneBadge
              : attempt
              ? AttemptBadge
              : NoAttemptBadge;

            return (
              <Badge
                style={{ flex: 1 }}
                key={number}
                title={`${number}: ${
                  flash ? "flash" : top ? "top" : zone ? "zone" : "no send"
                }`}
              />
            );
          })}
        </div>
      ) : null}
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
          .filter((event) => event.start > new Date())
          .map((event, i) => (
            <article
              key={String(event.start)}
              className={!(i % 2) ? "left" : "right"}
            >
              <div className="content" style={{ opacity: 0.5 }}>
                <EventContent event={event} />
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

  return `${hours || "0"}:${minutes < 10 ? `0${minutes}` : String(minutes)}:${
    seconds < 10 ? `0${seconds}` : String(seconds)
  }`;
}
