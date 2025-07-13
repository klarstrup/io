import { TZDate } from "@date-fns/tz";
import { auth } from "../../../auth";
import { Modal } from "../../../components/Modal";
import { DEFAULT_TIMEZONE } from "../../../utils";
import { mostRecentlyScrapedAt } from "../actions";
import { DiaryAgenda } from "../DiaryAgenda";
import { DiaryPoller } from "../DiaryPoller";
import { KeyHandler } from "./KeyHandler";

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

  const timeZone = user.timeZone || DEFAULT_TIMEZONE;
  const now = TZDate.tz(timeZone);

  return (
    <Modal dismissTo={`/diary`}>
      <DiaryPoller
        mostRecentlyScrapedAtAction={mostRecentlyScrapedAt}
        loadedAt={now}
        userId={user.id}
      />
      <KeyHandler date={date} />
      <div className="h-screen w-full max-w-3xl overflow-auto overscroll-contain rounded-xl bg-white p-2 shadow-xl shadow-black/50">
        <DiaryAgenda user={user} date={date} isModal />
      </div>
    </Modal>
  );
}
