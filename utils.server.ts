import { AggregateOptions, Collection, Document } from "mongodb";
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
  | "insertMany"
  | "createIndexes"
  | "aggregate"
>;
export function proxyCollection<TSchema extends Document>(name: string) {
  return new Proxy({} as ProxyCollection<TSchema>, {
    get<K extends keyof ProxyCollection<TSchema>>(
      _target: unknown,
      property: K,
    ) {
      if (property === "find") {
        return function (
          ...args: Parameters<ProxyCollection<TSchema>["find"]>
        ) {
          return {
            async *[Symbol.asyncIterator]() {
              const DB = await getDB();

              for await (const document of DB.collection(name).find(...args)) {
                yield document;
              }
            },
            async toArray() {
              const DB = await getDB();

              return DB.collection(name)
                .find(...args)
                .toArray();
            },
          };
        };
      }

      if (property === "aggregate") {
        return function (pipeline?: Document[], options?: AggregateOptions) {
          return {
            async *[Symbol.asyncIterator]() {
              const DB = await getDB();

              for await (const document of DB.collection(name).aggregate(
                pipeline,
                options,
              )) {
                yield document;
              }
            },
            async toArray() {
              const DB = await getDB();

              return DB.collection(name).aggregate(pipeline, options).toArray();
            },
          };
        };
      }

      return async function (...args: Parameters<ProxyCollection<TSchema>[K]>) {
        const DB = await getDB();

        // @ts-expect-error - we know this is a valid property, but TypeScript can't verify it
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return DB.collection(name)[property](...args);
      };
    },
  });
}
