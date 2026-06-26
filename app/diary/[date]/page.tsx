import { Modal } from "../../../components/Modal";
import { dayStartHour } from "../../../utils";
import { DiaryAgendaDay } from "../DiaryAgendaDay";

export default async function DiaryDayModal(props: {
  params: Promise<{ date: `${number}-${number}-${number}` }>;
}) {
  const { date } = await props.params;

  const dayStart = new Date(date);
  dayStart.setHours(dayStartHour);

  return (
    <Modal dismissTo={`/diary`}>
      <DiaryAgendaDay selectedDayStart={dayStart} />
    </Modal>
  );
}
