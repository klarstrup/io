import { redirect } from "next/navigation";

const scraperEndpoints = [
  "ical_scrape",
  "myfitnesspal_scrape",
  "rundouble_scrape",
  "tomorrow_scrape",
  "toplogger_gql_scrape",
  "toplogger_gql_scrape",
  "toplogger_gql_scrape",
  "toplogger_gql_scrape",
  "toplogger_gql_scrape",
] as const;

export function GET() {
  const scraperEndoint =
    scraperEndpoints[Math.floor(Math.random() * scraperEndpoints.length)]!;

  redirect(`/api/${scraperEndoint}`);
}
