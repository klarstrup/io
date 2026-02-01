import { TZDate } from "@date-fns/tz";
import { auth } from "../../../auth";
import { Modal } from "../../../components/Modal";
import { DEFAULT_TIMEZONE } from "../../../utils";
import { DiaryAgenda } from "../DiaryAgenda";
import { DiaryPoller } from "../DiaryPoller";
import { KeyHandler } from "./KeyHandler";

export default async function DiaryDayModal(props: {
  params: Promise<{ date: `${number}-${number}-${number}` }>;
}) {
  const { date } = await props.params;
  const user = (await auth())?.user;

  return (
    <Modal dismissTo={`/diary`}>
      <KeyHandler date={date} />
      <div className="h-screen w-full max-w-3xl overflow-auto overscroll-contain rounded-xl bg-white p-2 shadow-xl shadow-black/50">
        <DiaryAgenda user={user} date={date} />
      </div>
    </Modal>
  );
}
