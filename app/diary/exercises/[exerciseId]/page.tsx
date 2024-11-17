import { Suspense } from "react";
import { Modal } from "../../../../components/Modal";
import { isPRType } from "../../../../lib";
import DiaryExercise from "./DiaryExercise";

export default async function DiaryExerciseModal(props: {
  params: Promise<{ exerciseId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const exerciseId = Number((await props.params).exerciseId);

  const searchParams = await props.searchParams;
  const prType = isPRType(searchParams.prType)
    ? searchParams.prType
    : undefined;

  const mergeWorkouts = searchParams.mergeWorkouts === "true";

  return (
    <Modal>
      <div className="h-screen w-screen max-w-3xl overflow-auto overscroll-contain rounded-xl bg-white p-4 shadow-xl shadow-black/50">
        <Suspense>
          <DiaryExercise
            exerciseId={exerciseId}
            mergeWorkouts={mergeWorkouts}
            prType={prType}
          />
        </Suspense>
      </div>
    </Modal>
  );
}
