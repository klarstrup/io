import { NextRequest, connection } from "next/server";
import { auth } from "../../../auth";
import { PostNord } from "../../../sources/postnord";
import { PostNordShipmentInformation } from "../../../sources/postnord.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { DEFAULT_TIMEZONE } from "../../../utils";
import { jsonStreamResponse } from "../scraper-utils";

export const maxDuration = 45;

async function fetchPostNordShipmentInformation(
  shipmentId: string,
  locale: string,
  timeZone: string,
) {
  console.log({ shipmentId, locale, timeZone });
  const shipmentInformationUrl = new URL(
    "https://api2.postnord.com/rest/shipment/v1/trackingweb/shipmentInformation",
  );
  shipmentInformationUrl.searchParams.set("shipmentId", shipmentId);
  shipmentInformationUrl.searchParams.set("locale", locale);
  shipmentInformationUrl.searchParams.set("timeZone", timeZone);
  console.log(shipmentInformationUrl);
  const res = await fetch(shipmentInformationUrl, {
    headers: {
      accept: "*/*",
      "accept-language": "en-NO,en-US;q=0.9,en;q=0.8,da;q=0.7",
      "cache-control": "no-cache",
      "sec-ch-ua":
        '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
      "x-bap-key": "web-tracking-sc",
      "x-customheader":
        "AJtRqtxaDP6PSdBVHpTIexsz/sFC4oZknkq7c6QVa1OdA6B602UHiKJtiufxPZ7zQlkvpd0xIRH43ZM2QnLcJS0tMTI3MDJkZGEtY2IyNC00ZmE5LWIxNWQtNGZjNzc1YThkMTYx",
      Referer: "https://tracking.postnord.com/",
      origin: "https://tracking.postnord.com",
    },
    body: null,
    method: "GET",
  });
  if (!res.ok || res.status !== 200) {
    throw new Error("Failed to fetch shipment information: " + res.statusText);
  }
  return (await res.json()) as PostNord.ShipmentInformation;
}

export const GET = (request: NextRequest) =>
  jsonStreamResponse(async function* () {
    await connection();

    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.PostNord,
      async function* ({/*config: { shipmentIds }*/}, setUpdated) {
        setUpdated(false);

        yield "Fetching product summaries";

        const shipmentInformation = await fetchPostNordShipmentInformation(
          "CC501401383DE",
          "da",
          user.timeZone || DEFAULT_TIMEZONE,
        );

        const updateOneResult = await PostNordShipmentInformation.updateOne(
          { shipmentId: shipmentInformation.shipmentId, _io_userId: user.id },
          {
            $set: {
              ...shipmentInformation,
              items: shipmentInformation.items.map((item) => ({
                ...item,
                returnDate: item.returnDate && new Date(item.returnDate),
                events:
                  item.events &&
                  item.events.map((event) => ({
                    ...event,
                    eventTime: event.eventTime && new Date(event.eventTime),
                  })),
              })),
            },
          },
          { upsert: true },
        );
        yield shipmentInformation;
        setUpdated(updateOneResult);
      },
      request.nextUrl.searchParams.get("userDataSourceId"),
    );
  });
