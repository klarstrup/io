import { TZDate } from "@date-fns/tz";
import { auth } from "../../../auth";
import { Onsight } from "../../../sources/onsight";
import {
  OnsightCompetitions,
  OnsightCompetitionScores,
} from "../../../sources/onsight.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      DataSource.Onsight,
      user.dataSources ?? [],
      user,
      async function* (_dataSource, { token }, setUpdated) {
        setUpdated(false);

        const headers = {
          "x-appery-database-id": "562e0e3be4b081edd3eb975d",
          "x-appery-session-token": token,
        };
        const competitions = (await (
          await fetch(
            "https://api.appery.io/rest/1/db/collections/Competition",
            { headers },
          )
        ).json()) as Onsight.Competition[];

        for (const competition of competitions) {
          const { modifiedCount, upsertedCount } =
            await OnsightCompetitions.updateOne(
              { _id: competition._id },
              {
                $set: {
                  ...competition,
                  _createdAt: new Date(competition._createdAt),
                  _updatedAt: new Date(competition._updatedAt),
                  startAt: new TZDate(
                    `${competition.Date} ${competition.Start.split(" - ")[0]}`,
                    "Europe/Copenhagen",
                  ),
                  endAt: new TZDate(
                    `${competition.Date} ${competition.Start.split(" - ")[1]}`,
                    "Europe/Copenhagen",
                  ),
                },
              },
              { upsert: true },
            );
          yield competition;
          setUpdated(modifiedCount > 0 || upsertedCount > 0);

          const competitionScoreURL = new URL(
            "https://api.appery.io/rest/1/db/collections/Competition_score",
          );
          competitionScoreURL.searchParams.set(
            "where",
            JSON.stringify({
              Competition_name: `${competition.Name}/${competition._id}`,
            }),
          );
          const competitionScores = (await (
            await fetch(competitionScoreURL, { headers })
          ).json()) as Onsight.CompetitionScore[];

          for (const competitionScore of competitionScores) {
            const { modifiedCount, upsertedCount } =
              await OnsightCompetitionScores.updateOne(
                { _id: competitionScore._id },
                {
                  $set: {
                    ...competitionScore,
                    _createdAt: new Date(competitionScore._createdAt),
                    _updatedAt: new Date(competitionScore._updatedAt),
                  },
                },
                { upsert: true },
              );
            yield competitionScore;
            setUpdated(modifiedCount > 0 || upsertedCount > 0);
          }
        }
      },
    );
  });
