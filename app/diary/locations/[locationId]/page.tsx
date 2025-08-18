import { Modal } from "../../../../components/Modal";
import DiaryLocation from "./DiaryLocation";

export default async function DiaryExerciseModal(props: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const locationId = (await props.params).locationId;

  return (
    <Modal>
      <div className="h-screen w-full max-w-2xl overflow-auto overscroll-contain rounded-xl bg-white p-2 shadow-xl shadow-black/50">
        <DiaryLocation locationId={locationId} />
        <span className="opacity-0">
          x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x
          x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x
          x x
        </span>
      </div>
    </Modal>
  );
}
