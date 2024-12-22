import { auth } from "../../auth";
import CSSBasedPopover from "../../components/CSSBasedPopover";
import { FieldSetX } from "../../components/FieldSet";
import UserStuffWorkoutScheduleForm from "../../components/UserStuffWorkoutScheduleForm";
import { getAllWorkoutExercises } from "../../models/workout.server";

export default async function DiaryAgendaWorkoutsSettings() {
  const user = (await auth())?.user;

  return (
    <CSSBasedPopover control="⚙️" className="relative z-10">
      <div className="left-3 top-3 hidden max-h-[90vh] w-96 max-w-[90vw] overflow-auto rounded-lg bg-[yellow] p-2 shadow-[yellow_0_0_20px]">
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
    </CSSBasedPopover>
  );
}
