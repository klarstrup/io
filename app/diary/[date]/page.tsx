import { Modal } from "../../../components/Modal";
import { DiaryAgendaDay } from "../DiaryAgendaDay";

export default async function DiaryDayModal(props: {
  params: Promise<{ date: `${number}-${number}-${number}` }>;
}) {
  const { date } = await props.params;

  return (
    <Modal dismissTo={`/diary`}>
      <div className="h-screen w-full max-w-3xl overflow-auto overscroll-contain rounded-xl bg-white p-2 shadow-xl shadow-black/50">
        <DiaryAgendaDay dayDate={new Date(date)} />
      </div>
    </Modal>
  );
}
