import type { DiaryEntry } from "../../lib";
import { FoodEntry } from "./FoodEntry";

export function DiaryAgendaFood({
  date,
  food,
}: {
  food: DiaryEntry["food"];
  date: `${number}-${number}-${number}`;
}) {
  const dayTotalEnergy = food?.reduce(
    (acc, foodEntry) => acc + foodEntry.nutritional_contents.energy.value,
    0,
  );
  const dayTotalProtein = food?.reduce(
    (acc, foodEntry) => acc + (foodEntry.nutritional_contents.protein || 0),
    0,
  );

  return (
    <fieldset className="rounded-lg border-x-0 border-y-4 border-gray-200 px-1 py-2">
      <legend className="ml-2">
        <big>Food</big>{" "}
        {dayTotalEnergy && dayTotalProtein ? (
          <small>
            {Math.round(dayTotalEnergy)} kcal, {Math.round(dayTotalProtein)}g
            protein
          </small>
        ) : null}
      </legend>
      {food ? (
        <FoodEntry foodEntries={food} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center">
          <p className="mb-2">No food logged</p>
          <div>
            <a
              href={`https://www.myfitnesspal.com/food/diary?date=${date}`}
              target="_blank"
              className="mb-4 inline-block cursor-pointer rounded-2xl bg-[#ff0] px-3 py-2 pr-4 text-center text-xl font-semibold"
            >
              ➕ Food
            </a>
          </div>
        </div>
      )}
    </fieldset>
  );
}

const weatherCodes = {
  0: "Unknown",
  1000: "Clear",
  1001: "Cloudy",
  1100: "Mostly Clear",
  1101: "Partly Cloudy",
  1102: "Mostly Cloudy",
  2000: "Fog",
  2100: "Light Fog",
  3000: "Light Wind",
  3001: "Wind",
  3002: "Strong Wind",
  4000: "Drizzle",
  4001: "Rain",
  4200: "Light Rain",
  4201: "Heavy Rain",
  5000: "Snow",
  5001: "Flurries",
  5100: "Light Snow",
  5101: "Heavy Snow",
  6000: "Freezing Drizzle",
  6001: "Freezing Rain",
  6200: "Light Freezing Rain",
  6201: "Heavy Freezing Rain",
  7000: "Ice Pellets",
  7101: "Heavy Ice Pellets",
  7102: "Light Ice Pellets",
  8000: "Thunderstorm",
} as const;
const prettyPrintWeatherCode = (code: string) => {
  const truncatedCode = code.slice(0, 4);

  if (truncatedCode in weatherCodes) {
    return weatherCodes[truncatedCode as unknown as keyof typeof weatherCodes];
  }

  return "Unknown";
};
