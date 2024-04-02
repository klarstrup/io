import { isFuture, isPast } from "date-fns";
import { Fragment } from "react";
import { EventEntry } from "../../lib";
import { cotemporality } from "../../utils";
import TimelineEventContent from "./TimelineEventContent";
import { TimelineTrainingArticle } from "./TimelineTrainingArticle";

export function TimelineEventsList({
  events,
  urlDisciplines,
  from,
  to,
}: {
  events: EventEntry[];
  urlDisciplines: string[] | undefined;
  from?: Date;
  to?: Date;
}) {
  const now = new Date();

  return events.map((event, j) => {
    const nextEvent = events[j - 1];

    return (
      <Fragment key={event.id}>
        {(!nextEvent || isFuture(nextEvent.start)) && isPast(event.start) ? (
          (to && isPast(new Date(to))) ||
          (from && isFuture(new Date(from))) ? null : (
            <article className="now">
              <div className="content">
                You are <b>now</b>
              </div>
            </article>
          )
        ) : null}
        <TimelineTrainingArticle
          from={event.end}
          to={nextEvent?.start || now}
          urlDisciplines={urlDisciplines}
        />
        <article>
          <div className={`content ${cotemporality(event)}`}>
            <TimelineEventContent
              eventEntry={event}
              urlDisciplines={urlDisciplines}
            />
          </div>
        </article>
      </Fragment>
    );
  });
}
