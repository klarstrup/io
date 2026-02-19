import { proxyCollection } from "../utils.server";
import { Spiir } from "./spiir";

export const SpiirAccountGroups =
  proxyCollection<Spiir.AccountGroup>("spiir_account_groups");
