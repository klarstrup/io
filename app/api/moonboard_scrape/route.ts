import { tz, TZDate } from "@date-fns/tz";
import { auth } from "../../../auth";
import {
  MoonBoard,
  moonboardGradeStringToNumber,
} from "../../../sources/moonboard";
import { MoonBoardLogbookEntries } from "../../../sources/moonboard.server";
import { DataSource } from "../../../sources/utils";
import { wrapSource } from "../../../sources/utils.server";
import { roundToNearestDay } from "../../../utils";
import { jsonStreamResponse } from "../scraper-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = () =>
  // eslint-disable-next-line require-yield
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    for (const dataSource of user.dataSources ?? []) {
      if (dataSource.source !== DataSource.MoonBoard) continue;

      yield* wrapSource(
        dataSource,
        user,
        async function* ({ token, user_id }, setUpdated) {
          const logbook = (await fetch(
            `https://www.moonboard.com/Account/GetLogbook/${user_id}`,
            {
              headers: {
                "content-type":
                  "application/x-www-form-urlencoded; charset=UTF-8",
                cookie: `_MoonBoard=${token};`,
              },
              body: "sort=&page=1&pageSize=40&group=&filter=setupId~eq~'17'~and~Configuration~eq~2",
              method: "POST",
            },
          ).then((res) => res.json())) as MoonBoard.GetLogbookResponse;

          yield { logbook };

          for (const logbookDate of logbook.Data) {
            const logbookEntries = (await fetch(
              `https://www.moonboard.com/Account/GetLogbookEntries/${user_id}/${logbookDate.Id}`,
              {
                headers: {
                  "content-type":
                    "application/x-www-form-urlencoded; charset=UTF-8",
                  cookie: `_MoonBoard=${token};`,
                },
                body: "sort=&page=1&pageSize=30&group=&filter=setupId~eq~'17'~and~Configuration~eq~2",
                method: "POST",
              },
            ).then((res) => res.json())) as MoonBoard.GetLogbookEntriesResponse;

            const dateFromASPNet = (dateStr: string) =>
              new TZDate(
                Number(dateStr.replace(/\/Date\((\d+)\)\//, "$1")),
                "UTC",
              );

            for (const entry of logbookEntries.Data) {
              const { modifiedCount, upsertedCount } =
                await MoonBoardLogbookEntries.updateOne(
                  { Id: entry.Id },
                  {
                    $set: {
                      ...entry,
                      DateClimbed: roundToNearestDay(
                        dateFromASPNet(entry.DateClimbed),
                        { in: tz("UTC") },
                      ),
                      DateInserted: entry.DateInserted
                        ? dateFromASPNet(entry.DateInserted)
                        : null,
                      GradeNumber:
                        entry.Grade &&
                        moonboardGradeStringToNumber[entry.Grade],
                      Problem: {
                        ...entry.Problem,
                        DateInserted: entry.Problem.DateInserted
                          ? dateFromASPNet(entry.Problem.DateInserted)
                          : null,
                        DateUpdated: entry.Problem.DateUpdated
                          ? dateFromASPNet(entry.Problem.DateUpdated)
                          : null,
                        GradeNumber:
                          entry.Problem.Grade &&
                          moonboardGradeStringToNumber[entry.Problem.Grade],
                        UserGradeNumber:
                          entry.Problem.UserGrade &&
                          moonboardGradeStringToNumber[entry.Problem.UserGrade],
                      },
                    },
                  },
                  { upsert: true },
                );
              setUpdated(modifiedCount > 0 || upsertedCount > 0);
            }

            yield { logbookEntries };
          }
        },
      );
    }
  });
