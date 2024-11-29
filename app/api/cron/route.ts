import { redirect } from "next/navigation";
import { scraperEndpoints } from "../scraper-utils";

export function GET() {
  const endoint =
    scraperEndpoints[Math.floor(Math.random() * scraperEndpoints.length)]!;

  redirect(`/api/${endoint}`);
}
