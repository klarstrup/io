import { auth } from "../../auth";
import { DiaryAgendaDay } from "./DiaryAgendaDay";
import { TodoDragDropContainer } from "./TodoDroppable";

export const maxDuration = 45;

export default async function DiaryLayout(_props: PageProps<"/diary">) {
  const user = (await auth())?.user;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-2xl flex-col items-stretch justify-center py-2">
      <div className="flex flex-col items-stretch px-2">
        <TodoDragDropContainer userId={user?.id}>
          <DiaryAgendaDay user={user} />
        </TodoDragDropContainer>
      </div>
    </div>
  );
}
