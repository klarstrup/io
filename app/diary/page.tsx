import { DiaryAgendaDay } from "./DiaryAgendaDay";
import JournalNumbersBar from "./JournalNumbersBar";
import { TodoDragDropContainer } from "./TodoDroppable";

export const maxDuration = 45;

export default function DiaryLayout(_props: PageProps<"/diary">) {
  return (
    <>
      <JournalNumbersBar />
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-2xl flex-col items-stretch justify-center py-2">
        <div className="flex flex-col items-stretch px-2">
          <TodoDragDropContainer>
            <DiaryAgendaDay />
          </TodoDragDropContainer>
        </div>
      </div>
    </>
  );
}
