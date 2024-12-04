export const scraperEndpoints = [
  "ical_scrape",
  "myfitnesspal_scrape",
  "rundouble_scrape",
  "tomorrow_scrape",
  "toplogger_gql_scrape",
  "kilterboard_scrape",
] as const;

export function jsonStreamResponse(
  generator: (flushJSON: (data: unknown) => Promise<void>) => AsyncGenerator,
) {
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

    for await (const value of generator(flushJSON)) await flushJSON(value);
  })()
    .catch(async (error: Error) => {
      console.error(error);

      if (error instanceof Error) {
        const serializableError = {};
        for (const key of Object.getOwnPropertyNames(
          error,
        ) as (keyof typeof error)[]) {
          serializableError[key] = error[key];
        }
        if (process.env.NODE_ENV !== "development") {
          // @ts-expect-error - mehs
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
