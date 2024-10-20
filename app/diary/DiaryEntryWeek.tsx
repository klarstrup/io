import { TZDate } from "@date-fns/tz";
import { endOfWeek, getISOWeek, setISOWeek, startOfWeek } from "date-fns";
import { auth } from "../../auth";
import { DEFAULT_TIMEZONE } from "../../utils";
import { DiaryEntryList } from "./DiaryEntryList";
import { getDiaryEntries } from "./getDiaryEntries";

export async function DiaryEntryWeek({
  isoWeek,
  pickedDate,
}: {
  isoWeek: number;
  pickedDate?: `${number}-${number}-${number}`;
}) {
  const user = (await auth())?.user;

  if (!user) {
    return (
      <div>
        <span>Hello, stranger!</span>
        <p>
          <a href="/api/auth/signin">Sign in</a>
        </p>
      </div>
    );
  }

  const timeZone = user.timeZone || DEFAULT_TIMEZONE;

  const weekDate = setISOWeek(TZDate.tz(timeZone), isoWeek);
  const diaryEntries = await getDiaryEntries({
    from: startOfWeek(weekDate, { weekStartsOn: 1 }),
    to: endOfWeek(weekDate, { weekStartsOn: 1 }),
  });

  return (
    <div key={getISOWeek(weekDate)} className="flex">
      <div>{getISOWeek(weekDate)}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(8em, 1fr))",
          gridTemplateRows: "repeat(auto-fit, 8em)",
          flex: 1,
        }}
      >
        <DiaryEntryList diaryEntries={diaryEntries} pickedDate={pickedDate} />
      </div>
    </div>
  );
}
