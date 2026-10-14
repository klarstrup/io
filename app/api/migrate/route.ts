import { getDB } from "../../../dbConnect";

export const maxDuration = 45;

// $createObjectId only exists from MongoDB 8.3, so build a random 24-char hex
// string (ObjectId-shaped, 96 bits) from $rand. Every $rand is evaluated
// independently, so each element gets its own value.
const hexDigit = {
  $substrCP: [
    "0123456789abcdef",
    { $toInt: { $floor: { $multiply: [{ $rand: {} }, 16] } } },
    1,
  ],
};
const randomId = { $concat: Array.from({ length: 24 }, () => hexDigit) };

// Maps over an array field, adding a random `id` to each element unless it
// already has one, and merges in `extra` fields computed from the element.
const mapWithIds = (
  input: string,
  name: string,
  extra: (element: string) => Record<string, unknown> = () => ({}),
) => {
  const el = `${name}El`;
  return {
    $map: {
      input: { $ifNull: [input, []] },
      as: el,
      in: {
        $mergeObjects: [
          `$$${el}`,
          { id: { $ifNull: [`$$${el}.id`, randomId] } },
          extra(`$$${el}`),
        ],
      },
    },
  };
};

export async function GET() {
  const db = await getDB();

  const result = await db.collection("workouts").updateMany({}, [
    {
      $set: {
        exercises: mapWithIds("$exercises", "exercise", (exercise) => ({
          sets: mapWithIds(`${exercise}.sets`, "set"),
        })),
      },
    },
  ]);

  return Response.json(result);
}
