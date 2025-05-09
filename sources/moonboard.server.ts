import { proxyCollection } from "../utils.server";
import type { MoonBoard } from "./moonboard";

export const MoonBoardLogbookEntries = proxyCollection<MoonBoard.MongoLogbookEntry>(
  "moonboard_logbook_entries",
);
