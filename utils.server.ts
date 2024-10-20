import { Collection, Document } from "mongodb";
import { getDB } from "./dbConnect";

type ProxyCollection<TSchema extends Document> = Pick<
  Collection<TSchema>,
  | "distinct"
  | "find"
  | "findOne"
  | "updateOne"
  | "insertOne"
  | "countDocuments"
  | "updateMany"
  | "deleteMany"
>;
export function proxyCollection<
  TSchema extends Document,
  PCollection extends ProxyCollection<TSchema> = ProxyCollection<TSchema>,
>(name: string) {
  return new Proxy({} as PCollection, {
    // @ts-expect-error - ?
    get<K extends keyof PCollection>(_target: unknown, property: K) {
      if (property === "find") {
        return async function* (...args: Parameters<PCollection["find"]>) {
          const DB = await getDB();

          // @ts-expect-error - ?
          for await (const document of DB.collection(name).find(...args)) {
            yield document;
          }
        };
      }

      // @ts-expect-error - ?
      return async function (...args: Parameters<PCollection[K]>) {
        const DB = await getDB();

        // @ts-expect-error - ?
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return DB.collection(name)[property](...args);
      };
    },
  });
}
