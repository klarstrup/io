import { useApolloClient, useQuery } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { SourceWidgetDocument } from "../graphql.generated";
import { useNow } from "../hooks";
import { DataSource, UserDataSource } from "../sources/utils";
import { DistanceToNowStrict } from "./DistanceToNowStrict";

/** This is for compactly presenting status, timestamp and a refresh button for a data source inside of a popover    */
export default function SourceWidget({
  dataSource,
}: {
  dataSource: UserDataSource["source"];
}) {
  const [isScraping, setIsScraping] = useState(false);
  const client = useApolloClient();
  const router = useRouter();
  const now = useNow();

  const { data, refetch } = useQuery(SourceWidgetDocument, {
    // Poll every second while scraping, poll less frequently otherwise - this widget is never permanently anyway
    pollInterval: isScraping ? 1000 : 5000,
  });

  const refreshDataSource = useCallback(() => {
    setIsScraping(true);
    return fetch(`/api/${dataSource}_scrape`).finally(async () => {
      await client.refetchQueries({ include: "all" });
      router.refresh();
      setIsScraping(false);
      await refetch();
    });
  }, [client, dataSource, router, refetch]);

  if (!data || !data?.user?.dataSources) {
    return <div>Loading...</div>;
  }

  const sources = data.user.dataSources.filter(
    (ds) => ds.source === dataSource && !ds.paused,
  );

  return sources.map((source) => (
    <div key={source.id} className="flex items-start justify-between gap-1">
      <div className="flex items-stretch">
        <div className="flex gap-2">
          <div
            className={
              "flex h-full flex-col items-center justify-between gap-0.5 rounded-md text-sm"
            }
          >
            <button
              type="button"
              disabled={
                Boolean(
                  source.lastAttemptedAt &&
                  (!source.lastSuccessfulAt ||
                    new Date(source.lastAttemptedAt) >
                      new Date(source.lastSuccessfulAt)) &&
                  (!source.lastFailedAt ||
                    new Date(source.lastAttemptedAt) >
                      new Date(source.lastFailedAt)),
                ) ||
                Boolean(
                  source.lastAttemptedAt &&
                  new Date(source.lastAttemptedAt) >
                    new Date(now.valueOf() - 1000 * 60 * 5),
                ) ||
                source.paused ||
                source.source === DataSource.Fitocracy ||
                isScraping
              }
              className="cursor-pointer text-2xl disabled:cursor-not-allowed disabled:opacity-50"
              onClick={refreshDataSource}
            >
              🔄
            </button>
          </div>
          <div className="flex flex-1 flex-col justify-between leading-snug">
            {source.name !== source.source ? (
              <small>{source.source}</small>
            ) : null}
            <div className="text-sm font-semibold">{source.name}</div>
            <div className="whitespace-nowrap">
              {source.paused || source.source === DataSource.Fitocracy ? (
                <>
                  <small>Paused</small>{" "}
                  <span title="This data source is paused and will not be automatically fetched.">
                    ⏸️
                  </span>
                </>
              ) : (source.lastAttemptedAt &&
                  (!source.lastSuccessfulAt ||
                    new Date(source.lastAttemptedAt) >
                      new Date(source.lastSuccessfulAt)) &&
                  (!source.lastFailedAt ||
                    new Date(source.lastAttemptedAt) >
                      new Date(source.lastFailedAt))) ||
                isScraping ? (
                <>
                  {source.lastAttemptedAt ? (
                    <small>
                      <DistanceToNowStrict
                        date={new Date(source.lastAttemptedAt)}
                      />
                    </small>
                  ) : null}{" "}
                  <div className="inline-block animate-spin text-lg leading-0">
                    ↻
                  </div>
                </>
              ) : source.lastSuccessfulAt &&
                (!source.lastFailedAt ||
                  new Date(source.lastSuccessfulAt) >
                    new Date(source.lastFailedAt)) ? (
                <>
                  <small>
                    <DistanceToNowStrict
                      date={new Date(source.lastSuccessfulAt)}
                    />
                  </small>{" "}
                  ✅
                </>
              ) : source.lastFailedAt ? (
                <>
                  <small>
                    <DistanceToNowStrict date={new Date(source.lastFailedAt)} />
                  </small>{" "}
                  <span title={source.lastError || "Unknown error"}>⚠️</span>
                </>
              ) : (
                "☑️"
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ));
}
