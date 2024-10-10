import { TZDate } from "@date-fns/tz";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import {
  fetchAndParseIcal,
  getIcalCalendar,
  getIcalEventsBetween,
} from "../../../sources/ical";

export async function GET() {
  const user = (await auth())?.user;
  if (!user) return new Response("Unauthorized", { status: 401 });

  return NextResponse.json(
    await Promise.all(
      (user.icalUrls ?? []).map(async (icalUrl) => {
        const icalData = await fetchAndParseIcal(icalUrl);

        return Promise.all([
          getIcalCalendar(icalData),
          getIcalEventsBetween(icalData, {
            start: startOfDay(TZDate.tz("Europe/Copenhagen")),
            end: addDays(endOfDay(TZDate.tz("Europe/Copenhagen")), 7),
          }),
        ]);
      })
    )
  );
}
