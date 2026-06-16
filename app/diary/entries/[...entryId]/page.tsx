import JournalEntryModal from "../../JournalEntryModal";

export default async function DiaryEntryPage({
  params,
}: PageProps<"/diary/entries/[...entryId]">) {
  return (
    <JournalEntryModal
      entryId={decodeURIComponent((await params).entryId.join("/"))}
    />
  );
}
