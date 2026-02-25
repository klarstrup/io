import { ApolloCache } from "@apollo/client/core";

import Log from "./Log";
import onCacheWrite from "./onCacheWrite";

export interface TriggerFunctionConfig<T> {
  log: Log<T>;
  cache: ApolloCache;
}

export default function onAppBackground<T>({
  log,
  cache,
}: TriggerFunctionConfig<T>) {
  return (persist: () => void) => {
    log.warn(
      "Trigger option `background` not available on web; using `write` trigger",
    );
    return onCacheWrite({ cache })(persist);
  };
}
