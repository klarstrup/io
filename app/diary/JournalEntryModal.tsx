import { Modal } from "./Modal";

export default function JournalEntryModal({ entryId }: { entryId: string }) {
  return (
    <Modal>
      <div className="rounded bg-white p-4">
        <h2 className="mb-4 text-xl font-bold">Journal Entry {entryId}</h2>
        {/* Content of the journal entry goes here */}
      </div>
    </Modal>
  );
}
