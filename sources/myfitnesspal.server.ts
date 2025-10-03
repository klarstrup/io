import { getDaysInMonth } from "date-fns";
import { proxyCollection } from "../utils.server";
import { MyFitnessPal } from "./myfitnesspal";
import { fetchJson } from "../app/api/scraper-utils";

export const MyFitnessPalFoodEntries =
  proxyCollection<MyFitnessPal.MongoFoodEntry>("myfitnesspal_food_entries");

const fetchMyFitnessPal = <T>(input: string | URL, init?: RequestInit) =>
  fetchJson<T>(new URL(input, "https://www.myfitnesspal.com/api/"), init);

export const getMyFitnessPalReport = async (
  myFitnessPalToken: string,
  myFitnessPalUserName: string,
  year: number,
  monthStr:
    | "01"
    | "02"
    | "03"
    | "04"
    | "05"
    | "06"
    | "07"
    | "08"
    | "09"
    | "10"
    | "11"
    | "12",
) => {
  const month = new Date(year, Number(monthStr) - 1);
  const reportEntries = await fetchMyFitnessPal<MyFitnessPal.ReportEntry[]>(
    "services/diary/report",
    {
      method: "POST",
      body: JSON.stringify({
        username: myFitnessPalUserName,
        show_food_diary: 1,
        from: `${year}-${monthStr}-01`,
        to: `${year}-${monthStr}-${getDaysInMonth(month)}`,
      }),
      headers: {
        cookie: "__Secure-next-auth.session-token=" + myFitnessPalToken,
      },
    },
  );
  if (!Array.isArray(reportEntries)) {
    throw new Error(reportEntries);
  }

  return reportEntries;
};
