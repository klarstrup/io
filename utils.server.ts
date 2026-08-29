import {
  Abortable,
  AggregateOptions,
  Collection,
  Document,
  Filter,
  FindOptions,
  WithId,
} from "mongodb";
import { getDB } from "./dbConnect";

export type ProxyCollection<TSchema extends Document> = Pick<
  Collection<TSchema>,
  | "distinct"
  | "findOne"
  | "updateOne"
  | "insertOne"
  | "countDocuments"
  | "updateMany"
  | "deleteMany"
  | "insertMany"
  | "bulkWrite"
  | "createIndexes"
  | "aggregate"
> & {
  find<TDoc extends TSchema = TSchema>(): ReturnType<Collection<TDoc>["find"]>;
  find<TDoc extends TSchema = TSchema>(
    filter: Filter<TSchema>,
  ): {
    [Symbol.asyncIterator](): AsyncIterableIterator<WithId<TDoc>>;
    toArray(): Promise<WithId<TDoc>[]>;
  };
  find<
    TDoc extends TSchema = TSchema,
    FilterParam extends Filter<TSchema> = Filter<TSchema>,
    Options extends
      | (Omit<Parameters<Collection<TSchema>["find"]>[1], "projection"> & {
          projection: Projection;
        })
      | undefined = undefined,
    K extends Extract<keyof TSchema, string> = Extract<keyof TSchema, string>,
    Projection extends Partial<Record<K, 1>> = Options extends {
      projection: infer P;
    }
      ? P extends Partial<Record<K, 1>>
        ? P
        : never
      : never,
    ProjDoc = Projection extends Partial<Record<K, 1>>
      ? Pick<TDoc, Extract<keyof Projection, string>>
      : TDoc,
  >(
    filter: FilterParam,
    options: Options,
  ): {
    [Symbol.asyncIterator](): AsyncIterableIterator<WithId<ProjDoc>>;
    toArray(): Promise<WithId<ProjDoc>[]>;
  };
  find<TDoc extends TSchema = TSchema>(
    filter: Filter<TSchema>,
    options: Omit<FindOptions & Abortable, "projection">,
  ): {
    [Symbol.asyncIterator](): AsyncIterableIterator<WithId<TDoc>>;
    toArray(): Promise<WithId<TDoc>[]>;
  };
};

export function proxyCollection<TSchema extends Document>(name: string) {
  return new Proxy({} as ProxyCollection<TSchema>, {
    get<K extends keyof ProxyCollection<TSchema>>(
      _target: unknown,
      property: K,
    ) {
      if (property === "find") {
        return function (...args: Parameters<Collection<TSchema>["find"]>) {
          return {
            async *[Symbol.asyncIterator]() {
              const DB = await getDB();

              yield* DB.collection(name).find(...args);
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
