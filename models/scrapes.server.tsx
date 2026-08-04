import { DataSource } from "../sources/utils";
import { proxyCollection } from "../utils.server";

interface MongoScrape {
  scrapeId: string;
  attemptedAt: Date;
  settledAt: Date | null;
  source: DataSource;
  userId: string;
  userDataSourceId: string;
  success: boolean | null;
  updatedDatabase: boolean | null;
  error?: string | null;
  runtime: number | null;
}

export const Scrapes = proxyCollection<MongoScrape>("scrapes");
