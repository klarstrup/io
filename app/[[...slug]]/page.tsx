/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  Interval,
  differenceInMilliseconds,
  isAfter,
  isBefore,
  isFuture,
  isPast,
  max,
  min,
  startOfMonth,
} from "date-fns";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import Script from "next/script";
import { Fragment } from "react";
import { authOptions } from "../../auth";
import dbConnect from "../../dbConnect";
import type { EventEntry } from "../../lib";
import { User } from "../../models/user";
import { getIoClimbAlongCompetitionEventEntry } from "../../sources/climbalong";
import { getLiftingTrainingData } from "../../sources/fitocracy";
import { getRunningTrainingData } from "../../sources/rundouble";
import { getSongkickEvents } from "../../sources/songkick";
import { getSportsTimingEventEntry } from "../../sources/sportstiming";
import {
  IO_TOPLOGGER_ID,
  getBoulderingTrainingData,
  getGroupsUsers,
  getIoTopLoggerGroupEventEntry,
} from "../../sources/toplogger";
import { HOUR_IN_SECONDS, cotemporality } from "../../utils";
import "../page.css";
import { LoadPreviousMonthWhenYouSeeThisAlright } from "./LoadNextMonthWhenYouSeeThisAlright";
import TimelineEventContent from "./TimelineEventContent";
import TimelineTrainingContent from "./TimelineTrainingContent";

/*
export function generateStaticParams() {
  return ["", "index", "bouldering", "running", "metal"].map((slug) => ({
    slug: slug ? [slug] : undefined,
  }));
}
*/

async function TimelineTrainingArticle({
  from,
  to,
  urlDisciplines,
}: {
  from: Date;
  to: Date;
  urlDisciplines: string[] | undefined;
}) {
  const trainings: Awaited<ReturnType<typeof getTrainingData>> = (
    await getTrainingData(
      { start: min([from, to]), end: max([from, to]) },
      urlDisciplines
    )
  ).filter(({ count }) => count);

  return trainings.length ? (
    <article>
      <div className="content" style={{ padding: "7px 10px" }}>
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexDirection: "column",
            fontSize: "1.25em",
          }}
        >
          {trainings.map((training) => (
            <TimelineTrainingContent
              key={training.type + training.discipline}
              training={training}
              urlDisciplines={urlDisciplines}
            />
          ))}
        </div>
      </div>
    </article>
  ) : null;
}

export default async function Home({
  params: { slug: [disciplinesString] = [] },
  searchParams,
}: {
  params: { slug?: string[] };
  searchParams: { [key: string]: string };
}) {
  const now = new Date();
  const urlDisciplines: string[] | undefined =
    (disciplinesString !== "index" &&
      (disciplinesString as string | undefined)?.split("+")) ||
    undefined;
  const from = searchParams.from
    ? new Date(searchParams.from as unknown as string)
    : startOfMonth(new Date());
  const to = searchParams.to
    ? new Date(searchParams.to as unknown as string)
    : undefined;
  const events = await getData(urlDisciplines, { from, to });

  const session = await getServerSession(authOptions);

  const currentUser = (await User.findOne({ _id: session?.user.id }))?.toJSON();

  async function setFitocracySessionId(formData: FormData) {
    "use server";
    await dbConnect();

    const userModel = await User.findOne({ _id: session?.user.id });
    if (!userModel) throw new Error("No user found");

    const fitocracySessionId = formData.get("fitocracySessionId");
    if (typeof fitocracySessionId === "string") {
      userModel.fitocracySessionId = fitocracySessionId;
    }

    await userModel.save();

    // Doesn't need an actual tag name(since the new data will be in mongo not via fetch)
    // calling it at all will make the page rerender with the new data.
    revalidateTag("");
  }

  return (
    <div>
      {currentUser ? (
        <div>
          <span>
            Hello, <strong>{currentUser.name}</strong>
            <small>({currentUser.email})</small>!
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img
              src={currentUser.image || ""}
              width={50}
              height={50}
              style={{ borderRadius: "100%" }}
            />
          </span>
          <p>
            <a href="/api/auth/signout">Sign out</a>
          </p>
          {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
          <form action={setFitocracySessionId}>
            <input
              name="fitocracySessionId"
              defaultValue={currentUser.fitocracySessionId || ""}
            />
            <input type="submit" value="Set Fitocracy session ID" />
          </form>
          <pre>{JSON.stringify(session, null, 2)}</pre>
          <pre>{JSON.stringify(currentUser, null, 2)}</pre>
        </div>
      ) : (
        <div>
          <span>Hello, stranger!</span>
          <p>
            <a href="/api/auth/signin">Sign in</a>
          </p>
        </div>
      )}
      <section id="timeline">
        {events.map((event, j) => {
          const nextEvent = events[j - 1];

          return (
            <Fragment key={event.id}>
              {(!nextEvent || isFuture(nextEvent.start)) &&
              isPast(event.start) ? (
                (searchParams.to && isPast(new Date(searchParams.to))) ||
                (searchParams.from &&
                  isFuture(new Date(searchParams.from))) ? null : (
                  <article className="now">
                    <div className="content">
                      You are <b>now</b>
                    </div>
                  </article>
                )
              ) : null}
              {urlDisciplines?.length
                ? null && (
                    <TimelineTrainingArticle
                      from={event.end}
                      to={nextEvent?.start || now}
                      urlDisciplines={urlDisciplines}
                    />
                  )
                : null}
              <article>
                <div className={`content ${cotemporality(event)}`}>
                  {event.source ? (
                    <TimelineEventContent
                      eventEntry={event}
                      urlDisciplines={urlDisciplines}
                    />
                  ) : null}
                </div>
              </article>
            </Fragment>
          );
        })}
        <LoadPreviousMonthWhenYouSeeThisAlright from={from} />
      </section>
      <Script key={String(new Date())} id={String(new Date())}>
        {`
        var balanceColumns = ${String(balanceColumns)};
        window.addEventListener("resize", () => {
          balanceColumns();
          setTimeout(() => balanceColumns(), 200);
          setTimeout(() => balanceColumns(), 400);
          setTimeout(() => balanceColumns(), 600);
        });
        window.addEventListener("popstate", () => {
          balanceColumns();
          setTimeout(() => balanceColumns(), 200);
          setTimeout(() => balanceColumns(), 400);
          setTimeout(() => balanceColumns(), 600);
        });
        window.addEventListener("navigate", () => {
          balanceColumns();
          setTimeout(() => balanceColumns(), 200);
          setTimeout(() => balanceColumns(), 400);
          setTimeout(() => balanceColumns(), 600);
        });
        balanceColumns();
        setTimeout(() => balanceColumns(), 200);
        setTimeout(() => balanceColumns(), 400);
        setTimeout(() => balanceColumns(), 600);
        `}
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
    disciplines?.includes("bouldering")
      ? await getBoulderingTrainingData(trainingInterval)
      : null,
    disciplines?.includes("running")
      ? await getRunningTrainingData(trainingInterval)
      : null,
    disciplines?.includes("bouldering") || disciplines?.includes("running")
      ? await getLiftingTrainingData(trainingInterval)
      : null,
  ].filter(Boolean);
};

const getData = async (
  disciplines?: string[],
  { from, to }: { from?: Date; to?: Date } | undefined = {}
) => {
  await dbConnect();

  const eventsPromises: (Promise<EventEntry> | EventEntry)[] = [];

  if (disciplines?.includes("bouldering") || !disciplines?.length) {
    eventsPromises.push(
      getIoClimbAlongCompetitionEventEntry(13, 844),
      getIoClimbAlongCompetitionEventEntry(20, 1284),
      getIoClimbAlongCompetitionEventEntry(26, 3381),
      getIoClimbAlongCompetitionEventEntry(27, 8468),
      getIoClimbAlongCompetitionEventEntry(28, 10770),
      getIoClimbAlongCompetitionEventEntry(30, 11951),
      getIoClimbAlongCompetitionEventEntry(32, 12091),
      getIoClimbAlongCompetitionEventEntry(33, 12477),
      getIoClimbAlongCompetitionEventEntry(34),
      ...(
        await getGroupsUsers(
          { filters: { user_id: IO_TOPLOGGER_ID } },
          { maxAge: HOUR_IN_SECONDS }
        )
      ).map(({ group_id, user_id }) =>
        getIoTopLoggerGroupEventEntry(group_id, user_id)
      )
    );
  }
  if (disciplines?.includes("running") || !disciplines?.length) {
    eventsPromises.push(
      getSportsTimingEventEntry(12576, 5298030),
      getSportsTimingEventEntry(11107, 5177996),
      getSportsTimingEventEntry(10694, 5096890),
      getSportsTimingEventEntry(8962, 4433356),
      getSportsTimingEventEntry(8940, 3999953),
      getSportsTimingEventEntry(7913, 3825124),
      getSportsTimingEventEntry(5805, 2697593),
      getSportsTimingEventEntry(5647, 2619935),
      getSportsTimingEventEntry(4923, 2047175)
    );
  }
  if (disciplines?.includes("metal") || !disciplines?.length) {
    eventsPromises.push(...(await getSongkickEvents()));
  }

  return (await Promise.all(eventsPromises))
    .filter((event) => {
      if (from && isBefore(event.end, from)) return false;

      if (to && isAfter(event.start, to)) return false;

      return true;
    })
    .sort((a, b) => differenceInMilliseconds(b.start, a.start));
};
