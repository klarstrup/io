import { OpenBankingClient } from "@open-banking-io/client";
import type { NextRequest } from "next/server";
import { authUser } from "../../../auth";
import { OpenBankingAccounts } from "../../../sources/openbanking.server";
import { DataSource } from "../../../sources/utils";
import { wrapSources } from "../../../sources/utils.server";
import { jsonStreamResponse } from "../scraper-utils";

export const maxDuration = 45;

const apiBaseUrl = "https://open-banking.io";

export const GET = (request: NextRequest) =>
  jsonStreamResponse(async function* () {
    const user = await authUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    yield* wrapSources(
      user,
      DataSource.OpenBanking,
      async function* ({ config: { apiKey, privateKeyPkcs8 } }, setUpdated) {
        setUpdated(false);

        if (!apiKey || !privateKeyPkcs8) {
          throw new Error(
            "No API key or private key configured for OpenBankingClient",
          );
        }

        const obClient = new OpenBankingClient({
          apiBaseUrl,
          apiKey,
          privateKeyPkcs8,
        });

        const accounts = await obClient.getAccounts();

        await OpenBankingAccounts.bulkWrite(
          accounts.map((account) => ({
            updateOne: {
              filter: { accountId: account.id },
              update: {
                $set: {
                  _io_userId: user.id,
                  ...account,
                },
              },
              upsert: true,
            },
          })),
        );

        yield* accounts.map((account) => account.iban);
      },
      request.nextUrl.searchParams.get("userDataSourceId"),
    );
  });
