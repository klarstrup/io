import SourceWidget from "../../components/SourceWidget";
import { DataSource } from "../../sources/utils";

export default function JournalEntryModal({ entryId }: { entryId: string }) {
  const [entityType, entityId] = entryId.split(":");

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

  if (entityType === "Event") {
    return (
      <div>
        <h1>Event Entry</h1>
        <p className="break-all">Entity ID: {entityId}</p>
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
