import { DiaryAgendaDay } from "./DiaryAgendaDay";
import { TodoDragDropContainer } from "./TodoDroppable";

export const maxDuration = 45;

export default function DiaryLayout(_props: PageProps<"/diary">) {
  return (
    <div className="max-h-screen min-h-screen">
      <div className="mx-auto max-h-screen max-w-2xl self-stretch border-black/25 px-2">
        <TodoDragDropContainer>
          <DiaryAgendaDay />
        </TodoDragDropContainer>
      </div>
    </div>
  );
}
