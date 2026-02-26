import { Modal } from "../../../components/Modal";
import { DiaryAgendaDay } from "../DiaryAgendaDay";

export default async function DiaryDayModal(props: {
  params: Promise<{ date: `${number}-${number}-${number}` }>;
}) {
  const { date } = await props.params;

  return (
    <Modal dismissTo={`/diary`}>
      <DiaryAgendaDay dayDate={new Date(date)} />
    </Modal>
  );
}
