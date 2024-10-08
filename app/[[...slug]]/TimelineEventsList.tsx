import { isFuture, isPast } from "date-fns";
import { Fragment } from "react";
import { EventEntry } from "../../lib";
import { cotemporality } from "../../utils";
import { BalanceColumnsScript } from "./BalanceColumnsScript";
import TimelineEventContent from "./TimelineEventContent";

export function TimelineEventsList({
  events,
  disciplines,
  from,
  to,
}: {
  events: EventEntry[];
  disciplines: string[] | undefined;
  from?: Date;
  to?: Date;
}) {
  //  const now = new Date();

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
        <article key={event.id}>
          <div className={`content ${cotemporality(event)}`}>
            <TimelineEventContent
              eventEntry={event}
              disciplines={disciplines}
            />
          </div>
        </article>
        <BalanceColumnsScript />
      </Fragment>
    );
  });
}
