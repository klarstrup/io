import { ExerciseInfo } from "../graphql.generated";
import { ExerciseData } from "../models/exercises.types";

export function ExerciseName({
  exerciseInfo,
}: {
  exerciseInfo:
    | Pick<ExerciseData, "name" | "aliases">
    | Pick<ExerciseInfo, "name" | "aliases">;
}) {
  const shortestName = [exerciseInfo.name, ...exerciseInfo.aliases]
    .filter((name) => name.length >= 4)
    .sort((a, b) => a.length - b.length)[0]!
    .replace("Barbell", "");

  const nonParentheticalPart = shortestName.split("(")[0]!.trim();
  const parentheticalPartMatch = shortestName.match(/\(([^)]+)\)/);
  const parentheticalPart = parentheticalPartMatch
    ? parentheticalPartMatch[1]
    : null;

  return (
    <>
      {nonParentheticalPart}
      {parentheticalPart && (
        <span className="text-[10px]"> {parentheticalPart}</span>
      )}
    </>
  );
}
