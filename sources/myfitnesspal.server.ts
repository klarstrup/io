import { endOfMonth, getDaysInMonth, startOfMonth } from "date-fns";
import { dbFetch } from "../fetch";
import { HOUR_IN_SECONDS, getMaxAgeFactor } from "../utils";
import { MyFitnessPal } from "./myfitnesspal";
import { proxyCollection } from "../utils.server";

export const MyFitnessPalFoodEntries =
  proxyCollection<MyFitnessPal.MongoFoodEntry>("myfitnesspal_food_entries");

const fetchMyFitnessPal = async <T>(
  input: string | URL,
  init?: RequestInit | null,
  dbOptions?: Parameters<typeof dbFetch>[2],
) =>
  await dbFetch<T>(
    new URL(input, "https://www.myfitnesspal.com/api/"),
    init,
    dbOptions,
  );

export const getMyFitnessPalSession = async (myFitnessPalToken: string) => {
  const session = await fetchMyFitnessPal<
    MyFitnessPal.Session | Record<string, never>
  >(
    "auth/session",
    {
      headers: {
        cookie: "__Secure-next-auth.session-token=" + myFitnessPalToken,
      },
    },
    { maxAge: HOUR_IN_SECONDS },
  );

  if (!session.user) throw new Error("myFitnessPalToken is not valid");

  return session as MyFitnessPal.Session;
};

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
    {
      maxAge:
        (HOUR_IN_SECONDS / 2) *
        getMaxAgeFactor({ start: startOfMonth(month), end: endOfMonth(month) }),
    },
  );
  if (!Array.isArray(reportEntries)) {
    throw new Error(reportEntries);
  }

  return reportEntries;
};
