import Link from "next/link";
import { Fragment, HTMLProps, SVGProps } from "react";
import { getIoClimbAlongCompetitionEvent } from "../../climbalong";
import { SCORING_SOURCE, Score } from "../../lib";
import { getSongkickEvents } from "../../songkick";
import { getSportsTimingEventResults } from "../../sportstiming";
import { getIoTopLoggerGroupEvent } from "../../toplogger";

const pr = new Intl.PluralRules("en-DK", { type: "ordinal" });

const suffixes = {
  one: "st",
  two: "nd",
  few: "rd",
  other: "th",
} as const;

const formatOrdinals = (n: number) => suffixes[pr.select(n)] as string;

function RankBadge({ score }: { score: Score }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateAreas: '"a b" "a c"',
        lineHeight: 0.75,
        fontSize: "2em",
      }}
    >
      <div style={{ fontSize: "1.5em", fontWeight: 700, gridArea: "a" }}>
        {score.rank}
      </div>
      <div
        style={{ fontSize: "0.5em", lineHeight: 1, gridArea: "b" }}
        title="Percentile"
      >
        {score.percentile}
        <small style={{ verticalAlign: "top" }}>
          <small>%</small>
        </small>
      </div>
      <div style={{ fontSize: "0.75em", fontWeight: 600, gridArea: "c" }}>
        {formatOrdinals(score.rank)}
      </div>
    </div>
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
            "km",
            (score.distance / 1000).toLocaleString("en-DK", {
              unit: "kilometer",
            }),
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
          <dt title={title ? String(title) : undefined}>{label}</dt>
          <dd style={{ fontSize: "1.5em", fontWeight: 600 }}>{data}</dd>
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

export default function TimelineEventContent({
  event: {
    type,
    discipline,
    start,
    end,
    venue,
    location,
    event,
    scores,
    noParticipants,
    problems,
    problemByProblem,
    category,
    team,
    id,
    url,
    ...e
  },
  urlDisciplines,
}: {
  urlDisciplines?: string[];
  event:
    | Awaited<
        ReturnType<
          | typeof getSportsTimingEventResults
          | typeof getIoClimbAlongCompetitionEvent
          | typeof getIoTopLoggerGroupEvent
        >
      >
    | Awaited<ReturnType<typeof getSongkickEvents>>[number];
}) {
  const officialScores = scores.filter(
    (score) => score.source === SCORING_SOURCE.OFFICIAL
  );
  const derivedScores = scores
    .filter((score) => score.source === SCORING_SOURCE.DERIVED)
    .filter((derivedScore) => {
      return !scores
        .filter((score) => score.source === SCORING_SOURCE.OFFICIAL)
        .some(
          (officialScore) =>
            JSON.stringify({ ...officialScore, source: undefined }) ===
            JSON.stringify({ ...derivedScore, source: undefined })
        );
    });

  return (
    <Fragment key={id}>
      <div style={{ fontSize: "0.75em", marginBottom: "4px" }}>
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
        {venue && !event.includes(venue) ? (
          <span style={{ whiteSpace: "nowrap" }}>
            {" "}
            at <b>{venue}</b>
          </span>
        ) : location && !event.includes(location) ? (
          <span style={{ whiteSpace: "nowrap" }}>
            {" "}
            in <b>{location}</b>
          </span>
        ) : (
          ""
        )}
      </div>
      <h2
        style={{
          margin: 0,
          lineHeight: 1,
          display: "flex",
          gap: "5px",
        }}
      >
        <Link
          title={`${discipline} ${type}`}
          href={urlDisciplines?.includes(discipline) ? "/" : `/${discipline}`}
          style={{ textDecoration: "none", cursor: "pointer" }}
        >
          {discipline === "metal"
            ? "🤘"
            : discipline === "bouldering"
            ? "🧗‍♀️"
            : discipline === "running"
            ? "🏃‍♀️"
            : null}
        </Link>
        <span>
          <a href={url} rel="external noopener" target="_blank">
            {event
              .replace(
                new RegExp(
                  `#${new Date(start).toLocaleDateString("da-DK", {
                    month: "long",
                  })}`,
                  "i"
                ),
                ""
              )
              .replace(
                `${new Date(start).toLocaleDateString("da-DK", {
                  year: "numeric",
                })}`,
                ""
              )
              .trim()}
          </a>{" "}
          {team ? (
            <span style={{ fontSize: "0.75em", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: "0.75em", fontWeight: "normal" }}>
                with
              </span>{" "}
              {team}
            </span>
          ) : null}
        </span>
      </h2>
      {problems || noParticipants || category ? (
        <small>
          {problems ? <b>{problems} problems</b> : null}
          {problems && noParticipants ? <> between </> : null}
          {noParticipants ? <b>{noParticipants} participants</b> : null}
          {noParticipants && category ? <> in the </> : null}
          {category ? (
            <b>{category === "male" ? "M" : category} bracket</b>
          ) : null}
        </small>
      ) : null}
      {officialScores.length
        ? officialScores.map((score) => (
            <div
              key={score.system}
              style={{
                display: "flex",
                flexFlow: "wrap",
                alignItems: "center",
                gap: "10px",
                marginTop: "0.25em",
              }}
            >
              <RankBadge score={score} />
              <ResultList score={score} />
            </div>
          ))
        : null}
      {urlDisciplines?.includes(discipline) && derivedScores.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: "0.25em" }}>
          {derivedScores.map((score) => (
            <fieldset
              key={score.source + score.system}
              style={{
                fontSize: "0.75em",
              }}
            >
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
                  display: "flex",
                  flexFlow: "wrap",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "0.25em",
                }}
              >
                <RankBadge score={score} />
                <ResultList score={score} />
              </div>
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
                style={{ flex: 1, maxWidth: "100%" }}
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
    </Fragment>
  );
}

function seconds2time(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds - hours * 3600) / 60);
  seconds = seconds - hours * 3600 - minutes * 60;

  return `${hours ? `${hours}:` : ""}${
    minutes < 10 ? `0${minutes}` : String(minutes)
  }:${seconds < 10 ? `0${seconds}` : String(seconds)}`;
}