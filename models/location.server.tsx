import { proxyCollection } from "../utils.server";
import { LocationData } from "./location";

export const Locations = proxyCollection<LocationData>("locations");
