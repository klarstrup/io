import JournalEntryModal from "../../JournalEntryModal";
import { Modal } from "../../Modal";

export default async function DiaryEntryPage({
  params,
}: PageProps<"/diary/entries/[...entryId]">) {
  return (
    <Modal>
      <JournalEntryModal
        entryId={decodeURIComponent((await params).entryId.join("/"))}
      />
    </Modal>
  );
}
