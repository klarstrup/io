/* eslint-disable @typescript-eslint/unbound-method */
import { ApolloCache } from "@apollo/client/core";

export interface TriggerFunctionConfig {
  cache: ApolloCache;
}

export default function onCacheWrite({ cache }: TriggerFunctionConfig) {
  return (persist: () => void) => {
    const write = cache.write;
    const evict = cache.evict;
    const modify = cache.modify;
    const gc = cache.gc;

    cache.write = (...args: unknown[]) => {
      const result = write.apply(cache, args) as ReturnType<typeof write>;
      persist();
      return result;
    };
    cache.evict = (...args: unknown[]) => {
      const result = evict.apply(cache, args) as ReturnType<typeof evict>;
      persist();
      return result;
    };
    cache.modify = (...args: unknown[]) => {
      const result = modify.apply(cache, args) as ReturnType<typeof modify>;
      persist();
      return result;
    };
    cache.gc = (...args: unknown[]) => {
      const result = gc.apply(cache, args) as ReturnType<typeof gc>;
      persist();
      return result;
    };

    return () => {
      cache.write = write;
      cache.evict = evict;
      cache.modify = modify;
      cache.gc = gc;
    };
  };
}
