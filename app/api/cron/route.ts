import { redirect } from "next/navigation";
import { scraperEndpoints } from "../scraper-utils";

export function GET() {
  const scraperEndoint =
    scraperEndpoints[Math.floor(Math.random() * scraperEndpoints.length)]!;

  redirect(`/api/${scraperEndoint}`);
}
