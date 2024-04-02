import { isFuture, max, min } from "date-fns";
import dbConnect from "../../dbConnect";
import { DateInterval } from "../../lib";
import { User } from "../../models/user";
import { getBoulderingTrainingData } from "../../sources/toplogger";
import { getRunningTrainingData } from "../../sources/rundouble";
import { getLiftingTrainingData } from "../../sources/fitocracy";
import TimelineTrainingContent from "./TimelineTrainingContent";

const getTrainingData = async (
  trainingInterval: DateInterval,
  disciplines?: string[]
) => {
  await dbConnect();
  const user = await User.findOne();
  return [
    disciplines?.includes("bouldering")
      ? await getBoulderingTrainingData(trainingInterval)
      : null,
    disciplines?.includes("running") && user?.runDoubleId
      ? await getRunningTrainingData(user.runDoubleId, trainingInterval)
      : null,
    disciplines?.includes("bouldering") || disciplines?.includes("running")
      ? await getLiftingTrainingData(trainingInterval)
      : null,
  ].filter(Boolean);
};

export async function TimelineTrainingArticle({
  from,
  to,
  urlDisciplines,
}: {
  from: Date;
  to: Date;
  urlDisciplines: string[] | undefined;
}) {
  if (isFuture(from)) return null;

  const trainingInterval = { start: min([from, to]), end: max([from, to]) };
  const trainings: Awaited<ReturnType<typeof getTrainingData>> = (
    await getTrainingData(trainingInterval, urlDisciplines)
  ).filter(({ count }) => count);

  return trainings.length ? (
    <article>
      <div className="content" style={{ padding: "7px 10px" }}>
        <div style={{ fontSize: "0.75em", marginBottom: "1px" }}>
          <b>
            {new Intl.DateTimeFormat("en-DK", {
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "Europe/Copenhagen",
            }).formatRange(
              ...([trainingInterval.start, trainingInterval.end].sort(
                (a, b) => Number(a) - Number(b)
              ) as [Date, Date])
            )}
          </b>{" "}
          in <b>Training</b>
        </div>
        <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
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
