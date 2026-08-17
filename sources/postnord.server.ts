import { proxyCollection } from "../utils.server";
import type { PostNord } from "./postnord";

export const PostNordShipmentInformation = proxyCollection<PostNord.ShipmentInformation>(
  "postnord_shipment_information",
);

