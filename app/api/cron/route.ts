import { redirect } from "next/navigation";
import { scraperAndMaterializerEndpoints } from "../scraper-utils";

export function GET() {
  const endoint =
    scraperAndMaterializerEndpoints[
      Math.floor(Math.random() * scraperAndMaterializerEndpoints.length)
    ]!;

  redirect(`/api/${endoint}`);
}
