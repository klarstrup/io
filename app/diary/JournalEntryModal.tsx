"use client";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import SourceWidget from "../../components/SourceWidget";
import { JournalEntryDocument } from "../../graphql.generated/graphql";
import { DataSource } from "../../sources/utils";
import { DiaryAgendaDayEvent } from "./DiaryAgendaDayEvent";

gql`
  query JournalEntry($type: String!, $id: ID!) {
    user {
      id
      timeZone
      journalEntry(type: $type, id: $id) {
        __typename
        ... on Todo {
          id
          created
          summary
          due
          completed
        }
        ... on Sleep {
          id
          deviceId
          startedAt
          endedAt
          totalSleepTime
        }
        ... on Trip {
          id
          start
          end
          legs {
            start
            end
            from
            to
            mode
          }
        }
        ... on Event {
          id
          created
          summary
          start
          end
          due
          datetype
          location
          url
          transparency
        }
      }
    }
  }
`;

export default function JournalEntryModal({ entryId }: { entryId: string }) {
  const [entityType, entityId] = entryId.split(":");

  const { data } = useQuery(JournalEntryDocument, {
    variables: { type: entityType!, id: entityId! },
  });

  if (entityType === "Todo") {
    return (
      <div>
        <h1>Todo Entry</h1>
        <p>Entity ID: {entityId}</p>
      </div>
    );
  }

  if (entityType === "Sleep") {
    return (
      <div>
        <h1>Sleep Entry</h1>
        <p className="break-all">Entity ID: {entityId}</p>
        <SourceWidget dataSource={DataSource.Withings} />
      </div>
    );
  }

  if (entityType === "Trip") {
    return (
      <div>
        <h1>Trip Entry</h1>
        <p className="break-all">Entity ID: {entityId}</p>
        <SourceWidget dataSource={DataSource.DSB} />
      </div>
    );
  }

  if (entityType === "Event") {
    return (
      <div>
        <h1>Event Entry</h1>
        <p className="break-all">Entity ID: {entityId}</p>
        {data?.user?.journalEntry &&
        data?.user.journalEntry?.__typename === "Event" ? (
          <DiaryAgendaDayEvent
            event={data?.user?.journalEntry}
            userTimeZone={data?.user?.timeZone}
          />
        ) : null}
        <div
          className="mt-4 grid max-w-full gap-2 border-t border-black/10 pt-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          }}
        >
          <SourceWidget dataSource={DataSource.ICal} />
        </div>
      </div>
    );
  }

  return "Unknown Entry Type";
}
