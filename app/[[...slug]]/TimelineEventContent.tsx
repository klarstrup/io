/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { differenceInDays } from "date-fns";
import Link from "next/link";
import { Fragment, HTMLProps } from "react";
import { EventEntry, SCORING_SOURCE, SCORING_SYSTEM, Score } from "../../lib";
import { getIoClimbAlongCompetitionEvent } from "../../sources/climbalong";
import { getSongkickEvents } from "../../sources/songkick";
import { getSportsTimingEventResults } from "../../sources/sportstiming";
import { getIoTopLoggerGroupEvent } from "../../sources/toplogger";
import { seconds2time } from "../../utils";
import ProblemByProblem from "./ProblemByProblem";

const sex = true;

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
    score.system === SCORING_SYSTEM.DISTANCE_RACE
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
      : score.system === SCORING_SYSTEM.POINTS
      ? [["Points", score.points]]
      : score.system === SCORING_SYSTEM.THOUSAND_DIVIDE_BY
      ? [["Points", score.points]]
      : score.system === SCORING_SYSTEM.TOPS_AND_ZONES
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

export default async function TimelineEventContent({
  eventEntry,
  urlDisciplines,
}: {
  eventEntry: EventEntry;
  urlDisciplines: string[] | undefined;
}) {
  const {
    source,
    type,
    discipline,
    start,
    end,
    venue,
    location,
    event,
    subEvent,
    scores,
    noParticipants,
    problems,
    problemByProblem,
    category,
    team,
    id,
    url,
  } = await (eventEntry.source === "climbalong"
    ? getIoClimbAlongCompetitionEvent(eventEntry.id, eventEntry.ioId, sex)
    : eventEntry.source === "toplogger"
    ? getIoTopLoggerGroupEvent(eventEntry.id, eventEntry.ioId, sex)
    : eventEntry.source === "sportstiming"
    ? getSportsTimingEventResults(eventEntry.id, eventEntry.ioId, sex)
    : eventEntry.source === "songkick"
    ? (await getSongkickEvents()).find(({ id }) => eventEntry.id === id)!
    : undefined)!;

  const officialScores = scores.filter(
    (score) => score.source === SCORING_SOURCE.OFFICIAL
  );
  const derivedScores = scores
    .filter((score) => score.source === SCORING_SOURCE.DERIVED)
    .filter(
      (derivedScore) =>
        !scores
          .filter((score) => score.source === SCORING_SOURCE.OFFICIAL)
          .some(
            (officialScore) =>
              JSON.stringify({ ...officialScore, source: undefined }) ===
              JSON.stringify({ ...derivedScore, source: undefined })
          )
    );

  return (
    <Fragment key={id}>
      <div
        style={{ fontSize: "0.75em", marginBottom: "4px" }}
        data-via={source}
      >
        <b>
          {new Intl.DateTimeFormat("en-DK", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: differenceInDays(start, end) ? undefined : "numeric",
            minute: differenceInDays(start, end) ? undefined : "2-digit",
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
                new RegExp(
                  `#(\\d+) ${new Date(start).toLocaleDateString("da-DK", {
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
      {subEvent || problems || noParticipants || category ? (
        <small>
          {subEvent ? <>{subEvent}, </> : null}
          {problems ? <b>{problems} problems</b> : null}
          {problems && noParticipants ? <> between </> : null}
          {noParticipants ? <b>{noParticipants} participants</b> : null}
          {noParticipants && category ? <> in the </> : null}
          {category ? (
            <b>
              {category === "male"
                ? "M"
                : category === "female"
                ? "F"
                : category}{" "}
              bracket
            </b>
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
                  score.system === SCORING_SYSTEM.POINTS
                    ? "100 per top, 20 bonus per flash"
                    : score.system === SCORING_SYSTEM.THOUSAND_DIVIDE_BY
                    ? "Each top grants 1000 points divided by the number of climbers who have topped it. 10% flash bonus."
                    : undefined
                }
              >
                {score.system === SCORING_SYSTEM.TOPS_AND_ZONES
                  ? "Tops & Zones"
                  : score.system === SCORING_SYSTEM.DISTANCE_RACE
                  ? "Race"
                  : score.system === SCORING_SYSTEM.POINTS
                  ? "Points"
                  : score.system === SCORING_SYSTEM.THOUSAND_DIVIDE_BY
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
        <ProblemByProblem problemByProblem={problemByProblem} />
      ) : null}
    </Fragment>
  );
}
