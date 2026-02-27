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

const fetchSpiirAPI = async <T>(input: string | URL, init?: RequestInit) => {
  const url = new URL(input, "https://api.spiir.dk/");
  return fetchJson<T>(url, init);
};

interface StartAutosyncResponse {
  updated: boolean;
  result: string;
  credentialsNeedingSupervisedLogin: [];
  disabledMessage: null;
}
const startAutosync = async (SessionKey: string) => {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 16; sdk_gphone64_arm64 Build/BP22.250325.006; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/133.0.6943.137 Mobile Safari/537.36",
    "X-Legal-Region": "EEA",
    "X-Platform": "Android",
    "X-PlatformVersion": "16",
    "X-Requested-With": "com.spiir",
    "X-Session": SessionKey,
  };
  return await fetchSpiirAPI<StartAutosyncResponse>("Banks/StartAutosync", {
    method: "POST",
    headers,
    body: "true",
  });
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

        // Try to make Spiir sync bank data
        yield await startAutosync(SessionKey);

        const headers = { cookie: `SessionKey=${SessionKey}` };

        const accountGroups = await getAccountGroups({ headers });

        if (!Array.isArray(accountGroups)) {
          yield `Invalid response from Spiir when fetching account groups:`;
          yield accountGroups;
          throw new Error(
            "Invalid response from Spiir when fetching account groups",
          );
        }

        await SpiirAccountGroups.createIndexes([
          { key: { id: 1 }, unique: true },
          { key: { _io_userId: 1 } },
        ]);

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

          yield accountGroup.id;

          setUpdated(updateResult);
        }
      },
    );
  });
