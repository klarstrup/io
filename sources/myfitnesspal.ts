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
    date: string;
    food_entries: FoodEntry[];
  }

  export interface MongoFoodEntry extends FoodEntry {
    datetime: Date;
    user_id: string;
  }

  export interface FoodEntry {
    id: string;
    type: FoodEntryType;
    client_id: null;
    date: string;
    meal_name: MealName;
    meal_position: number;
    food: Food;
    serving_size: ServingSize;
    servings: number;
    meal_food_id: string;
    nutritional_contents: NutritionalContents;
    geolocation: Record<string, never>;
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
