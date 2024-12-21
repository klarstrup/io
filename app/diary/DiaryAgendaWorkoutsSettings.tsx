import { auth } from "../../auth";
import { FieldSetX } from "../../components/FieldSet";
import UserStuffWorkoutScheduleForm from "../../components/UserStuffWorkoutScheduleForm";
import { getAllWorkoutExercises } from "../../models/workout.server";

export default async function DiaryAgendaWorkoutsSettings() {
  const user = (await auth())?.user;

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <style>
        {`
        #toggleDiaryAgendaWorkoutsSettings:checked + div {
          display: block !important; 
        }
        #toggleDiaryAgendaWorkoutsSettings:checked + div + label {
          display: block !important; 
        }
      `}
      </style>
      <label
        htmlFor="toggleDiaryAgendaWorkoutsSettings"
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        ⚙️
      </label>
      <input
        type="checkbox"
        id="toggleDiaryAgendaWorkoutsSettings"
        className="hidden"
      />
      <div
        style={{
          position: "absolute",
          left: "12px",
          top: "12px",
          background: "yellow",
          padding: "8px",
          display: "none",
          borderRadius: "10px",
          boxShadow: "yellow 0px 0px 20px",
          width: "420px",
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
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
      <label
        htmlFor="toggleDiaryAgendaWorkoutsSettings"
        className="backdrop-blur-sm"
        style={{
          display: "none",
          position: "fixed",
          zIndex: -1,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
        }}
      ></label>
    </div>
  );
}
