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

export const ClimbAlongPerformances =
  proxyCollection<Climbalong.Performance>(
    "climbalong_performances",
  );
