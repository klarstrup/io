import { proxyCollection } from "../utils.server";
import { OpenBanking } from "./openbanking";

export const OpenBankingAccounts = proxyCollection<OpenBanking.Account>(
  "openbanking_accounts",
);
