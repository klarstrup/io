import { proxyCollection } from "../utils.server";
import { Onsight } from "./onsight";

export const OnsightCompetitions = proxyCollection<
  Onsight.Competition & { startAt: Date; endAt: Date }
>("onsight_competitions");

export const OnsightCompetitionScores =
  proxyCollection<Onsight.CompetitionScore>("onsight_competition_scores");
