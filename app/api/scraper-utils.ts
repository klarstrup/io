import { connection } from "next/server";
import { DataSource } from "../../sources/utils";

export const scraperEndpoints = Object.values(DataSource).map(
  (source) => `/${source}_scrape`,
);

export const fetchJson = async <T>(url: string | URL, init?: RequestInit) =>
  fetch(url, init).then((res) => res.json() as Promise<T>);
export const fetchText = async (url: string | URL, init?: RequestInit) =>
  fetch(url, init).then((res) => res.text());

export async function jsonStreamResponse(generator: () => AsyncGenerator) {
  await connection();

  const responseStream = new TransformStream<Uint8Array, string>();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();
  let first = true;
  const flushJSON = async (data: unknown) => {
    if (first) {
      first = false;
    } else {
      await writer.write(encoder.encode(",\n"));
    }
    await writer.write(encoder.encode(JSON.stringify(data)));
  };
  (async () => {
    await writer.write(encoder.encode("[\n"));

    for await (const value of generator()) await flushJSON(value);
  })()
    .catch(async (error: unknown) => {
      console.error(error);

      if (error instanceof Error) {
        const serializableError = {};
        for (const key of Object.getOwnPropertyNames(
          error,
        ) as (keyof typeof error)[]) {
          serializableError[key] = error[key];
        }
        if (process.env.NODE_ENV !== "development") {
          // @ts-expect-error - i dont care
          delete serializableError.stack;
        }

        await flushJSON(serializableError);
      } else {
        await flushJSON(error);
      }
    })
    .finally(
      () =>
        void (async () => {
          await writer.write(encoder.encode("\n]"));

          await writer.close();
        })(),
    );

  return new Response(responseStream.readable, {
    headers: { "Content-Type": "application/json" },
  });
}

let averageLoopMs = 0;
const loopDurations: number[] = [];
export async function* deadlineLoop<T>(
  items: T[],
  getTimeRemaining: () => number,
  fn: (item: T) => AsyncGenerator<unknown, void>,
) {
  for (const item of items) {
    if (averageLoopMs / getTimeRemaining() > 0.8) {
      yield "deadlineLoop: Deadline reached, loop broken";
      break;
    }
    const loopStartedAt = Date.now();

    yield* fn(item);

    loopDurations.push(Date.now() - loopStartedAt);
    if (loopDurations.length > 10) loopDurations.shift();
    averageLoopMs =
      loopDurations.reduce((a, b) => a + b, 0) / loopDurations.length;
  }
}
