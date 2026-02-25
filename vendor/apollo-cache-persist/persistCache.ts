import CachePersistor from "./CachePersistor";
import { ApolloPersistOptions } from "./types";

export default function persistCache<T>(options: ApolloPersistOptions<T>) {
  const persistor = new CachePersistor(options);
  return persistor.restore();
}
