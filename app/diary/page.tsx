import { auth } from "../../auth";
import { DiaryAgendaDay } from "./DiaryAgendaDay";
import { TodoDragDropContainer } from "./TodoDroppable";

export const maxDuration = 45;

export default async function DiaryLayout(_props: PageProps<"/diary">) {
  const user = (await auth())?.user;

  return (
    <div className="flex min-h-screen flex-col justify-center py-2">
      <div className="mx-auto max-h-screen max-w-2xl self-stretch px-2">
        <TodoDragDropContainer userId={user?.id}>
          <DiaryAgendaDay user={user} />
        </TodoDragDropContainer>
      </div>
    </div>
  );
}
