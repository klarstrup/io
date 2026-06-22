import { DiaryAgendaDay } from "./DiaryAgendaDay";
import { TodoDragDropContainer } from "./TodoDroppable";

export const maxDuration = 45;

export default function DiaryLayout(_props: PageProps<"/diary">) {
  return (
    <TodoDragDropContainer>
      <DiaryAgendaDay />
    </TodoDragDropContainer>
  );
}
