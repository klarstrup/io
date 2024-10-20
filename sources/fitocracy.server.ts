import { proxyCollection } from "../utils.server";
import { Fitocracy } from "./fitocracy";

export const FitocracyWorkouts =
  proxyCollection<Fitocracy.MongoWorkout>("fitocracy_workouts");
