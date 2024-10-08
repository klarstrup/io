import { TZDate } from "@date-fns/tz";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import {
  fetchIcalCalendar,
  fetchIcalEventsBetween,
} from "../../../sources/ical";
import { auth } from "../../../auth";

export async function GET() {
  const user = (await auth())?.user;
  if (!user) return new Response("Unauthorized", { status: 401 });

  return NextResponse.json(
    await Promise.all(
      (user.icalUrls ?? []).map((icalUrl) =>
        Promise.all([
          fetchIcalCalendar(icalUrl),
          fetchIcalEventsBetween(icalUrl, {
            start: startOfDay(TZDate.tz("Europe/Copenhagen")),
            end: addDays(endOfDay(TZDate.tz("Europe/Copenhagen")), 7),
          }),
        ])
      )
    )
  );
}
