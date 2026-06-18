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

  return "Unknown Entry Type";
}
