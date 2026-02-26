import { addDays } from "date-fns";
import { auth } from "../../../auth";
import { Climbalong } from "../../../sources/climbalong";
import {
  ClimbAlongAthletes,
  ClimbAlongCircuits,
  ClimbAlongCompetitions,
  ClimbAlongEdges,
  ClimbAlongHolds,
  ClimbAlongLanes,
  ClimbAlongNodes,
  ClimbAlongPerformances,
  ClimbAlongProblems,
  ClimbAlongRounds,
} from "../../../sources/climbalong.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { partition, randomSliceOfSize } from "../../../utils";
import { deadlineLoop, fetchJson, jsonStreamResponse } from "../scraper-utils";

export const maxDuration = 45;

const fetchCA = <T>(path: string, init?: RequestInit) =>
  fetchJson<T>(new URL(path, `https://comp.climbalong.com/api/`), init);

export const GET = () =>
  jsonStreamResponse(async function* () {
    const startedAt = Date.now();
    const getTimeRemaining = () =>
      maxDuration * 1000 - (Date.now() - startedAt);

    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.ClimbAlong,
      async function* ({ config: { token } }, setUpdated) {
        setUpdated(false);

        const res = await fetch(
          "https://comp.climbalong.com/api/v0/userInCompetitions",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) {
          setUpdated(false);
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

        const [activeUserCompetitions, pastUserCompetitions] = partition(
          userInCompetitions,
          ({ competition }) =>
            addDays(new Date(competition.endTime), 1) > new Date(),
        );
        yield* deadlineLoop(
          [
            ...activeUserCompetitions,
            ...randomSliceOfSize(pastUserCompetitions, 1),
          ],
          () => getTimeRemaining(),
          async function* ({ competition, athlete }) {
            const { competitionId } = competition;
            const { athleteId } = athlete;

            await ClimbAlongCompetitions.updateOne(
              { competitionId },
              {
                $set: {
                  ...competition,
                  startTime: new Date(competition.startTime),
                  endTime: new Date(competition.endTime),
                },
              },
              { upsert: true },
            ).then(setUpdated);
            yield competition;

            await ClimbAlongAthletes.updateOne(
              { athleteId },
              { $set: { ...athlete } },
              { upsert: true },
            ).then(setUpdated);
            yield athlete;

            for (const lane of await fetchCA<Climbalong.Lane[]>(
              `v1/competitions/${competitionId}/lanes`,
            )) {
              await ClimbAlongLanes.updateOne(
                { laneId: lane.laneId },
                { $set: { ...lane } },
                { upsert: true },
              ).then(setUpdated);
              yield lane;
            }

            for (const hold of await fetchCA<Climbalong.Hold[]>(
              `v0/competitions/${competitionId}/holds`,
            )) {
              await ClimbAlongHolds.updateOne(
                { holdId: hold.holdId },
                { $set: { ...hold } },
                { upsert: true },
              ).then(setUpdated);
              yield hold;
            }

            for (const round of await fetchCA<Climbalong.Round[]>(
              `v1/competitions/${competitionId}/rounds`,
            )) {
              await ClimbAlongRounds.updateOne(
                { roundId: round.roundId },
                { $set: { ...round } },
                { upsert: true },
              ).then(setUpdated);
              yield round;
            }

            for (const [
              _lane,
              circuitChallengeNodes,
            ] of await fetchCA<Climbalong.CircuitChallengeNodesGroupedByLane>(
              `v1/competitions/${competitionId}/circuitchallengenodesgroupedbylane`,
            )) {
              for (const circuitChallengeNode of circuitChallengeNodes) {
                const circuit = circuitChallengeNode.circuit;

                await ClimbAlongCircuits.updateOne(
                  { circuitId: circuit.circuitId },
                  { $set: { ...circuit } },
                  { upsert: true },
                ).then(setUpdated);
                yield circuit;

                await ClimbAlongNodes.updateOne(
                  { nodeId: circuitChallengeNode.nodeId },
                  {
                    $set: {
                      ...circuitChallengeNode,
                      selfscoringOpen:
                        circuitChallengeNode.selfscoringOpen &&
                        new Date(circuitChallengeNode.selfscoringOpen),
                      selfscoringClose:
                        circuitChallengeNode.selfscoringClose &&
                        new Date(circuitChallengeNode.selfscoringClose),
                    },
                  },
                  { upsert: true },
                ).then(setUpdated);
                yield circuitChallengeNode;

                const circuitChallengeEdge =
                  await fetchCA<Climbalong.CircuitChallengeEdge>(
                    `v0/nodes/${circuitChallengeNode.nodeId}/edges/${circuitChallengeNode.outputEdgeIds[0]!}`,
                  );
                await ClimbAlongEdges.updateOne(
                  { processedBy: circuitChallengeEdge.processedBy },
                  { $set: { ...circuitChallengeEdge } },
                  { upsert: true },
                ).then(setUpdated);
                yield circuitChallengeEdge;

                for (const problem of await fetchCA<Climbalong.Problem[]>(
                  `v0/circuits/${circuit.circuitId}/problems`,
                )) {
                  await ClimbAlongProblems.updateOne(
                    { problemId: problem.problemId },
                    { $set: { ...problem } },
                    { upsert: true },
                  ).then(setUpdated);
                  yield problem;
                }

                for (const performance of await fetchCA<
                  Climbalong.Performance[]
                >(`v0/circuits/${circuit.circuitId}/performances`)) {
                  if (performance.athleteId !== athleteId) continue;

                  await ClimbAlongPerformances.updateOne(
                    {
                      athleteId: performance.athleteId,
                      circuitId: performance.circuitId,
                      problemId: performance.problemId,
                    },
                    {
                      $set: {
                        ...performance,
                        registrationTime: new Date(
                          performance.registrationTime,
                        ),
                        performanceStartedTime: new Date(
                          performance.performanceStartedTime,
                        ),
                        performanceEndedTime:
                          performance.performanceEndedTime &&
                          new Date(performance.performanceEndedTime),
                      },
                    },
                    { upsert: true },
                  ).then(setUpdated);
                  yield performance;
                }
              }
            }
          },
        );
      },
    );
  });
