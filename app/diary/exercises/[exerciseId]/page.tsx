import { Modal } from "../../../../components/Modal";
import { isExerciseHistoryTimeframe, isPRType } from "../../../../lib";
import DiaryExercise from "./DiaryExercise";

export default async function DiaryExerciseModal(
  props: PageProps<"/diary/exercises/[exerciseId]">,
) {
  const exerciseId = Number((await props.params).exerciseId);

  const searchParams = await props.searchParams;
  const prType = isPRType(searchParams.prType)
    ? searchParams.prType
    : undefined;
  const timeframe = isExerciseHistoryTimeframe(searchParams.timeframe)
    ? searchParams.timeframe
    : undefined;

  const mergeWorkouts = searchParams.mergeWorkouts === "true";

  return (
    <Modal>
      <div className="h-screen w-full max-w-3xl overflow-auto overscroll-contain rounded-xl bg-white p-2 shadow-xl shadow-black/50">
        <DiaryExercise
          exerciseId={exerciseId}
          mergeWorkouts={mergeWorkouts}
          prType={prType}
          timeframe={timeframe}
        />
        <span className="opacity-0">
          x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x
          x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x
          x x
        </span>
      </div>
    </Modal>
  );
}
