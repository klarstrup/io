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
  | "createIndexes"
>;
export function proxyCollection<
  TSchema extends Document,
  PCollection extends ProxyCollection<TSchema> = ProxyCollection<TSchema>,
>(name: string) {
  return new Proxy({} as PCollection, {
    // @ts-expect-error - ?
    get<K extends keyof PCollection>(_target: unknown, property: K) {
      if (property === "find") {
        return function (...args: Parameters<PCollection["find"]>) {
          return {
            async *[Symbol.asyncIterator]() {
              const DB = await getDB();

              // @ts-expect-error - ?
              for await (const document of DB.collection(name).find(...args)) {
                yield document;
              }
            },
            async toArray() {
              const DB = await getDB();

              return (
                DB.collection(name)
                  // @ts-expect-error - ?
                  .find(...args)
                  .toArray()
              );
            },
          };
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
