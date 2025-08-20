import { proxyCollection } from "../utils.server";
import { KilterBoard } from "./kilterboard";

export const KilterBoardAscents = proxyCollection<KilterBoard.Ascent>(
  "kilterboard_ascents",
);

export const KilterBoardBids =
  proxyCollection<KilterBoard.Bid>("kilterboard_bids");

export const KilterBoardClimbs =
  proxyCollection<KilterBoard.Climb>("kilterboard_climbs");
