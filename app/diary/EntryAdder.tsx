import type { Session } from "next-auth";
import type { DiaryEntry } from "../../lib";

export function EntryAdder({
  diaryEntry,
  user,
  onAddWorkout,
}: {
  diaryEntry: [`${number}-${number}-${number}`, DiaryEntry];
  user: Session["user"];
  onAddWorkout: () => void;
}) {
  const [date] = diaryEntry;

  return (
    <select
      onChange={(e) => {
        if (e.target.value === "workout") {
          onAddWorkout();
        }
        if (e.target.value === "food") {
          window.open(`https://www.myfitnesspal.com/food/diary?date=${date}`);
        }

        e.target.value = "";
      }}
      style={{
        fontSize: "1em",
        padding: "0.5em 0em",
        paddingRight: "0em",
        borderRadius: "1em",
        border: "none",
        background: "#ff0",
        textAlign: "center",
        maxWidth: "3em",
      }}
    >
      <option value="">➕</option>
      <option value="workout">Add Workout</option>
      {user.myFitnessPalToken ? <option value="food">Log Food</option> : null}
    </select>
  );
}
