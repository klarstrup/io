import { TZDate } from "@date-fns/tz";
import { auth } from "../../../auth";
import { Onsight } from "../../../sources/onsight";
import {
  OnsightCompetitions,
  OnsightCompetitionScores,
} from "../../../sources/onsight.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { fetchJson, jsonStreamResponse } from "../scraper-utils";

export const maxDuration = 45;

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.Onsight,
      async function* ({ config: { token } }, setUpdated) {
        setUpdated(false);

        const headers = {
          "x-appery-database-id": "562e0e3be4b081edd3eb975d",
          "x-appery-session-token": token,
        };
        const competitions = await fetchJson<Onsight.Competition[]>(
          "https://api.appery.io/rest/1/db/collections/Competition",
          { headers },
        );

        yield OnsightCompetitions.bulkWrite(
          competitions.map((competition) => ({
            updateOne: {
              filter: { _id: competition._id },
              update: {
                $set: {
                  ...competition,
                  _createdAt: new Date(competition._createdAt),
                  _updatedAt: new Date(competition._updatedAt),
                  startAt: new TZDate(
                    `${competition.Date} ${competition.Start.split(" - ")[0]!}`,
                    "Europe/Copenhagen",
                  ),
                  endAt: new TZDate(
                    `${competition.Date} ${competition.Start.split(" - ")[1]!}`,
                    "Europe/Copenhagen",
                  ),
                },
              },
              upsert: true,
            },
          })),
        );

        yield competitions;

        for (const competition of competitions) {
          const competitionScoreURL = new URL(
            "https://api.appery.io/rest/1/db/collections/Competition_score",
          );
          competitionScoreURL.searchParams.set(
            "where",
            JSON.stringify({
              Competition_name: `${competition.Name}/${competition._id}`,
            }),
          );
          const competitionScores = await fetchJson<Onsight.CompetitionScore[]>(
            competitionScoreURL,
            { headers },
          );

          yield OnsightCompetitionScores.bulkWrite(
            competitionScores.map((competitionScore) => ({
              updateOne: {
                filter: { _id: competitionScore._id },
                update: {
                  $set: {
                    ...competitionScore,
                    _createdAt: new Date(competitionScore._createdAt),
                    _updatedAt: new Date(competitionScore._updatedAt),
                  },
                },
                upsert: true,
              },
            })),
          );

          yield competitionScores;
        }
      },
    );
  });
