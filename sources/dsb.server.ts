import { proxyCollection } from "../utils.server";
import type { DSB } from "./dsb";

export const DSBProductSummaries = proxyCollection<DSB.ProductSummary>(
  "dsb_product_summaries",
);
