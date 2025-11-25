import { auth } from "../auth";
import { FieldSetX } from "./FieldSet";
import Popover from "./Popover";
import UserStuffWorkoutScheduleForm from "./UserStuffWorkoutScheduleForm";
import { getAllWorkoutExercises } from "../models/workout.server";

export default async function DiaryAgendaWorkoutsSettings() {
  const user = (await auth())?.user;

  return (
    <Popover
      control={<span className="text-3xl xl:text-4xl">⚙️</span>}
      showBackdrop={false}
    >
      <div className="absolute left-1/2 z-30 max-h-[66vh] w-96 max-w-[88vw] -translate-x-1/2 overflow-auto overscroll-contain rounded-lg bg-[yellow] p-2 shadow-[yellow_0_0_20px] pointer-coarse:bottom-9 pointer-fine:top-9">
        {user ? (
          <div className="flex flex-col gap-2">
            <FieldSetX legend="Workout Schedule" className="w-full">
              <UserStuffWorkoutScheduleForm
                exercisesStats={await getAllWorkoutExercises(user)}
                user={user}
              />
            </FieldSetX>
          </div>
        ) : null}
      </div>
    </Popover>
  );
}
