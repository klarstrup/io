import { auth } from "../../../auth";
import { Modal } from "../../../components/Modal";
import { DiaryAgenda } from "../DiaryAgenda";

export default async function DiaryDayModal(props: {
  params: Promise<{ date: `${number}-${number}-${number}` }>;
}) {
  const { date } = await props.params;
  const user = (await auth())?.user;

  if (!user) {
    return (
      <div>
        <p>Not logged in</p>
      </div>
    );
  }

  return (
    <Modal dismissTo={`/diary`}>
      <div className="h-full overflow-auto overscroll-contain rounded-xl bg-white p-4 shadow-xl shadow-black/50">
        <DiaryAgenda user={user} date={date} isModal />
      </div>
    </Modal>
  );
}
