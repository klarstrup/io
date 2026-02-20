import { auth } from "../../../auth";
import { Spiir } from "../../../sources/spiir";
import { SpiirAccountGroups } from "../../../sources/spiir.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { fetchJson, jsonStreamResponse } from "../scraper-utils";

export const maxDuration = 45;

const fetchSpiir = async <T>(input: string | URL, init?: RequestInit) => {
  const url = new URL(input, "https://mine.spiir.dk/");
  return fetchJson<T>(url, init);
};

const getAccountGroups = (init?: RequestInit) =>
  fetchSpiir<Spiir.AccountGroup[]>("Account/GetAccountGroups", init);

export const GET = () =>
  jsonStreamResponse(async function* () {
    const user = (await auth())?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.Spiir,
      async function* ({ config: { SessionKey } }, setUpdated) {
        setUpdated(false);

        if (!SessionKey) {
          throw new Error("No SessionKey configured for Spiir");
        }

        const headers = { cookie: `SessionKey=${SessionKey}` };

        const accountGroups = await getAccountGroups({ headers });

        if (!Array.isArray(accountGroups)) {
          yield `Invalid response from Spiir when fetching account groups:`;
          yield accountGroups;
          throw new Error(
            "Invalid response from Spiir when fetching account groups",
          );
        }

        for (const accountGroup of accountGroups) {
          const updateResult = await SpiirAccountGroups.updateOne(
            { id: accountGroup.id },
            {
              $set: {
                _io_userId: user.id,
                ...accountGroup,
                startDate:
                  accountGroup.startDate && new Date(accountGroup.startDate),
                endDate: accountGroup.endDate && new Date(accountGroup.endDate),
                lastUpdated:
                  accountGroup.lastUpdated &&
                  new Date(accountGroup.lastUpdated),
                periods: accountGroup.periods.map((period) => ({
                  ...period,
                  startDate: period.startDate && new Date(period.startDate),
                  endDate: period.endDate && new Date(period.endDate),
                })),
              },
            },
            { upsert: true },
          );

          setUpdated(updateResult);
        }
      },
    );
  });
