import { ObjectId } from "mongodb";
import { auth } from "../../../../auth";
import { Workout } from "../../../../graphql.generated";
import { Locations } from "../../../../models/location.server";
import { MaterializedWorkoutsView } from "../../../../models/workout.server";
import WorkoutEntry from "../../WorkoutEntry";

export default async function DiaryExercise({
  locationId,
}: {
  locationId: string;
}) {
  const user = (await auth())?.user;

  const location = await Locations.findOne({
    _id: new ObjectId(locationId),
    userId: user?.id,
  });

  if (!location) return null;

  const allWorkoutsOfLocation = user
    ? await MaterializedWorkoutsView.find(
        {
          userId: user.id,
          locationId,
          deletedAt: { $exists: false },
        },
        { sort: { workedOutAt: -1 } },
      ).toArray()
    : [];

  return (
    <>
      <h1 className="text-2xl font-semibold">
        <span className="text-gray-300">Location:</span> {location.name}
      </h1>
      <div className="mt-4 flex items-center gap-2">
        <h2 className="text-xl font-semibold">Workouts</h2>
      </div>
      <ul
        style={{
          display: "grid",
          gap: "8px 4px",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {allWorkoutsOfLocation.map((workout) => (
          <li key={workout.id} className="min-h-full">
            <WorkoutEntry
              showDate
              showLocation={false}
              workout={workout as unknown as Workout}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
