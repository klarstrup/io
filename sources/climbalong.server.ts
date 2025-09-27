import { proxyCollection } from "../utils.server";
import type { Climbalong } from "./climbalong";

export const ClimbAlongAthletes = proxyCollection<Climbalong.Athlete>(
  "climbalong_athletes",
);

export const ClimbAlongCompetitions = proxyCollection<Climbalong.Competition>(
  "climbalong_competitions",
);

export const ClimbAlongCircuits = proxyCollection<Climbalong.Circuit>(
  "climbalong_circuits",
);
export const ClimbAlongNodes =
  proxyCollection<Climbalong.Node>("climbalong_nodes");
export const ClimbAlongEdges =
  proxyCollection<Climbalong.Edge>("climbalong_edges");

export const ClimbAlongRounds =
  proxyCollection<Climbalong.Round>("climbalong_rounds");

export const ClimbAlongLanes =
  proxyCollection<Climbalong.Lane>("climbalong_lanes");

export const ClimbAlongProblems = proxyCollection<Climbalong.Problem>(
  "climbalong_problems",
);

export const ClimbAlongHolds =
  proxyCollection<Climbalong.Hold>("climbalong_holds");

export const ClimbAlongPerformances = proxyCollection<Climbalong.Performance>(
  "climbalong_performances",
);
