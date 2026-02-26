import { differenceInDays, isPast } from "date-fns";
import Link from "next/link";
import { Fragment, HTMLProps } from "react";
import ProblemByProblem from "../../../components/ProblemByProblem";
import {
  type EventEntry,
  EventSource,
  SCORING_SOURCE,
  SCORING_SYSTEM,
  type Score,
} from "../../../lib";
import { getIoClimbAlongCompetitionEvent } from "../../../sources/climbalong";
import { getIoOnsightCompetitionEvent } from "../../../sources/onsight";
import { getSongkickEvents } from "../../../sources/songkick";
import { getSportsTimingEventResults } from "../../../sources/sportstiming";
import { getIoTopLoggerCompEvent } from "../../../sources/toplogger";
import {
  DEFAULT_TIMEZONE,
  isNonEmptyArray,
  seconds2time,
} from "../../../utils";

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
  disciplines,
}: {
  eventEntry: EventEntry;
  disciplines: string[] | undefined;
}) {
  const {
    source,
    type,
    discipline,
    start,
    end,
    venue,
    location,
    eventName,
    subEventName,
    team,
    id,
    url,
    rounds,
  } = await (
    eventEntry.source === EventSource.ClimbAlong
      ? getIoClimbAlongCompetitionEvent(
          Number(eventEntry.id),
          Number(eventEntry.ioId),
        )
      : eventEntry.source === EventSource.TopLogger
        ? getIoTopLoggerCompEvent(
            String(eventEntry.id),
            String(eventEntry.ioId),
          )
        : eventEntry.source === EventSource.Onsight
          ? getIoOnsightCompetitionEvent(
              String(eventEntry.id),
              String(eventEntry.ioId),
            )
          : eventEntry.source === EventSource.Sportstiming
            ? getSportsTimingEventResults(
                Number(eventEntry.id),
                Number(eventEntry.ioId),
              )
            : eventEntry.source === EventSource.Songkick
              ? (await getSongkickEvents()).find(
                  ({ id }) => eventEntry.id === id,
                )
              : undefined
  )!;

  const timeZone = DEFAULT_TIMEZONE;

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
            timeZone: timeZone,
          }).formatRange(
            ...([start, end].sort((a, b) => Number(a) - Number(b)) as [
              Date,
              Date,
            ]),
          )}
        </b>
        {venue && !eventName.includes(venue) ? (
          <span style={{ whiteSpace: "nowrap" }}>
            {" "}
            at <b>{venue}</b>
          </span>
        ) : location && !eventName.includes(location) ? (
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
          prefetch={false}
          title={`${discipline} ${type}`}
          href={
            disciplines?.includes(discipline)
              ? "/events/"
              : `/events/${discipline}`
          }
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
            {eventName
              .replace(
                new RegExp(
                  `#${new Date(start).toLocaleDateString("da-DK", {
                    month: "long",
                  })}`,
                  "i",
                ),
                "",
              )
              .replace(
                new RegExp(
                  `#(\\d+) ${new Date(start).toLocaleDateString("da-DK", {
                    month: "long",
                  })}`,
                  "i",
                ),
                "",
              )
              .replace(
                new Date(start).toLocaleDateString("da-DK", {
                  year: "numeric",
                }),
                "",
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
      {subEventName ? <small>{subEventName}, </small> : null}
      {rounds
        ? rounds.map((round) => {
            const officialScores = round.scores?.filter(
              (score) => score.source === SCORING_SOURCE.OFFICIAL,
            );
            return (
              <Fragment key={round.id}>
                <small className="leading-none!">
                  {round.start && round.end ? (
                    <b>
                      {new Intl.DateTimeFormat("en-DK", {
                        month: "long",
                        day: "numeric",
                        hour: differenceInDays(round.start, round.end)
                          ? undefined
                          : "numeric",
                        minute: differenceInDays(round.start, round.end)
                          ? undefined
                          : "2-digit",
                        timeZone: timeZone,
                      }).formatRange(
                        ...([round.start, round.end].sort(
                          (a, b) => Number(a) - Number(b),
                        ) as [Date, Date]),
                      )}{" "}
                    </b>
                  ) : null}
                  {round.category ? (
                    <b>
                      {round.category === "male"
                        ? "M"
                        : round.category === "female"
                          ? "F"
                          : round.category}{" "}
                    </b>
                  ) : null}
                  {round.roundName ? <>{round.roundName}: </> : null}
                  {round.noParticipants ? (
                    <b>{round.noParticipants} participants</b>
                  ) : null}
                  {round.venue && !eventName.includes(round.venue) ? (
                    <span>
                      {" "}
                      at <b>{round.venue}</b>
                    </span>
                  ) : round.location && !eventName.includes(round.location) ? (
                    <span>
                      {" "}
                      in <b>{round.location}</b>
                    </span>
                  ) : (
                    ""
                  )}
                </small>
                {isNonEmptyArray(officialScores)
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
                {Array.isArray(round.problemByProblem) &&
                round.problemByProblem.length &&
                (round.start ? isPast(round.start) : true) ? (
                  <ProblemByProblem problemByProblem={round.problemByProblem} />
                ) : null}
              </Fragment>
            );
          })
        : null}
    </Fragment>
  );
}
