import { addWeeks } from "date-fns";
import type { NextRequest } from "next/server";
import { auth } from "../../../auth";
import { Meyers } from "../../../sources/meyers";
import { MeyersMenus } from "../../../sources/meyers.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { dayStartHour } from "../../../utils";
import { jsonStreamResponse } from "../scraper-utils";

export const maxDuration = 45;

export const GET = (request: NextRequest) =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.Meyers,
      async function* (_, setUpdated) {
        setUpdated(false);

        for (let i = 0; i < 3; i++) {
          const res = await fetch(
            `https://meyers.dk/api/foodop/menus?external_ids=28101&end_date=${
              addWeeks(new Date(), i).toISOString().split("T")[0]!
            }`,
          );

          if (!res.ok) {
            throw new Error(
              `Failed to fetch Meyer menus: ${res.status} ${res.statusText}`,
            );
          }
          const menusResponses = (await res.json()) as Meyers.MenusResponse[];

          for (const menuResponse of menusResponses) {
            yield await MeyersMenus.bulkWrite(
              menuResponse.menus.map((menu) => ({
                updateOne: {
                  filter: {
                    external_id: menuResponse.external_id,
                    date: menu.date,
                    names: menu.names,
                  },
                  update: {
                    $set: {
                      ...menu,
                      date_time: new Date(
                        menu.date +
                          `T${dayStartHour.toString().padStart(2, "0")}:00:00Z`,
                      ),
                      external_id: menuResponse.external_id,
                      subsidiary_name: menuResponse.subsidiary_name,
                    } satisfies Omit<Meyers.MongoMenu, "_id">,
                  },
                  upsert: true,
                },
              })),
            );
          }
        }
      },
      request.nextUrl.searchParams.get("userDataSourceId"),
    );
  });
