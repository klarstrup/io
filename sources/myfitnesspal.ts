import { endOfYear, startOfYear } from "date-fns";
import { dbFetch } from "../fetch";
import { HOUR_IN_SECONDS, getMaxAgeFactor } from "../utils";

export namespace MyFitnessPal {
  export interface Session {
    user: User;
    expires: Date;
    locale: string;
    userId: string;
    email: string;
    country: string;
    isMobileClient: boolean;
  }

  export interface User {
    name: string;
    email: string;
    image: string;
  }

  export interface ReportEntry {
    date: Date;
    food_entries: FoodEntry[];
  }

  export interface FoodEntry {
    id: string;
    type: FoodEntryType;
    client_id: null;
    date: Date;
    meal_name: MealName;
    meal_position: number;
    food: Food;
    serving_size: ServingSize;
    servings: number;
    meal_food_id: string;
    nutritional_contents: NutritionalContents;
    geolocation: Geolocation;
    image_ids: unknown[];
    tags: unknown[];
    consumed_at: null;
    logged_at: null;
    logged_at_offset: null;
  }

  export interface Food {
    id: string;
    user_id: string;
    version: string;
    brand_name: string;
    description: string;
    public: boolean;
    type: FoodType;
    verified: boolean;
    serving_sizes: ServingSize[];
    nutritional_contents: NutritionalContents;
  }

  export interface NutritionalContents {
    energy: Energy;
    fat: number | null;
    saturated_fat: number | null;
    polyunsaturated_fat: number | null;
    monounsaturated_fat: number | null;
    trans_fat: number | null;
    cholesterol: number | null;
    sodium: number | null;
    potassium: number | null;
    carbohydrates: number | null;
    fiber: number | null;
    sugar: number | null;
    protein: number | null;
    vitamin_a: number | null;
    vitamin_c: number | null;
    calcium: number | null;
    iron: number | null;
    added_sugars: null;
    vitamin_d: null;
    sugar_alcohols: null;
  }

  export interface Energy {
    unit: Unit;
    value: number;
  }

  export enum Unit {
    Calories = "calories",
  }

  export interface ServingSize {
    value: number;
    unit: string;
    nutrition_multiplier: number;
  }

  export enum FoodType {
    Food = "food",
    Recipe = "recipe",
  }

  export interface Geolocation {}

  export enum MealName {
    Breakfast = "Breakfast",
    Dinner = "Dinner",
    Lunch = "Lunch",
    Snacks = "Snacks",
  }

  export enum FoodEntryType {
    FoodEntry = "food_entry",
  }
}

const fetchMyFitnessPal = async <T>(
  input: string | URL,
  init?: RequestInit | null,
  dbOptions?: Parameters<typeof dbFetch>[2]
) =>
  await dbFetch<T>(
    new URL(input, "https://www.myfitnesspal.com/api/"),
    init,
    dbOptions
  );

export const getMyFitnessPalSession = async (myFitnessPalToken: string) =>
  await fetchMyFitnessPal<MyFitnessPal.Session>(
    "auth/session",
    {
      headers: {
        cookie: "__Secure-next-auth.session-token=" + myFitnessPalToken,
      },
    },
    { maxAge: HOUR_IN_SECONDS }
  );

export const getMyFitnessPalReport = async (
  myFitnessPalToken: string,
  year: number
) => {
  const session = await getMyFitnessPalSession(myFitnessPalToken);
  console.log(session);

  return await fetchMyFitnessPal<MyFitnessPal.ReportEntry[]>(
    "services/diary/report",
    {
      method: "POST",
      body: JSON.stringify({
        username: session.user?.name,
        show_food_diary: 1,
        from: `${year}-01-01`,
        to: `${year}-12-31`,
      }),
      headers: {
        cookie: "__Secure-next-auth.session-token=" + myFitnessPalToken,
      },
    },
    {
      maxAge:
        HOUR_IN_SECONDS *
        getMaxAgeFactor({
          start: startOfYear(new Date(year, 0, 1)),
          end: endOfYear(new Date(year, 11, 31)),
        }),
    }
  );
};
