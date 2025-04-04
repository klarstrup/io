import { auth } from "../../../auth";
import { Climbalong } from "../../../sources/climbalong";
import {
  ClimbAlongAthletes,
  ClimbAlongCompetitions,
  ClimbAlongPerformances,
} from "../../../sources/climbalong.server";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { shuffle } from "../../../utils";
import { materializeAllClimbalongWorkouts } from "../materialize_workouts/materializers";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.ClimbAlong) continue;

      yield* wrapSource(dataSource, user, async function* ({ token }) {
        const res = await fetch(
          "https://comp.climbalong.com/api/v0/userInCompetitions",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) {
          throw new Error(
            `Failed to fetch user competitions: ${res.status} ${res.statusText}`,
          );
        }
        const userInCompetitions = (await res.json()) as {
          userId: string;
          athlete: Climbalong.Athlete;
          competition: Climbalong.Competition;
          official: null;
        }[];

        for (const { competition, athlete } of shuffle(userInCompetitions)) {
          await ClimbAlongCompetitions.updateOne(
            { competitionId: competition.competitionId },
            {
              $set: {
                ...competition,
                endTime: new Date(competition.endTime),
                startTime: new Date(competition.startTime),
              },
            },
            { upsert: true },
          );
          yield competition;

          await ClimbAlongAthletes.updateOne(
            { athleteId: athlete.athleteId },
            { $set: { ...athlete } },
            { upsert: true },
          );
          yield athlete;

          const circuitChallengeNodesGroupedByLane = (await (
            await fetch(
              `https://comp.climbalong.com/api/v1/competitions/${competition.competitionId}/circuitchallengenodesgroupedbylane`,
            )
          ).json()) as Climbalong.CircuitChallengeNodesGroupedByLane;

          for (const [
            _lane,
            circuitChallengeNodes,
          ] of circuitChallengeNodesGroupedByLane) {
            for (const circuitChallengeNode of circuitChallengeNodes) {
              const circuitId = circuitChallengeNode.circuit.circuitId;

              const performances = (await (
                await fetch(
                  `https://comp.climbalong.com/api/v0/circuits/${circuitId}/performances`,
                )
              ).json()) as Climbalong.Performance[];

              for (const performance of performances) {
                if (performance.athleteId !== athlete.athleteId) {
                  continue;
                }
                await ClimbAlongPerformances.updateOne(
                  {
                    athleteId: performance.athleteId,
                    circuitId: performance.circuitId,
                    problemId: performance.problemId,
                  },
                  {
                    $set: {
                      ...performance,
                      registrationTime: new Date(performance.registrationTime),
                      performanceStartedTime: new Date(
                        performance.performanceStartedTime,
                      ),
                      performanceEndedTime:
                        performance.performanceEndedTime &&
                        new Date(performance.performanceEndedTime),
                    },
                  },
                  { upsert: true },
                );

                yield performance;
              }
            }
          }
        }
      });
    }

    yield* materializeAllClimbalongWorkouts({ user });
  });
