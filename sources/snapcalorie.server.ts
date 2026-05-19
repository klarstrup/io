import { proxyCollection } from "../utils.server";
import { SnapCalorie } from "./snapcalorie";

export const SnapCalorieMeals =
  proxyCollection<SnapCalorie.Meal>("snapcalorie_meals");
