import type { Session } from "next-auth";
import { auth } from "../../../auth";
import { Locations } from "../../../models/location.server";
import {
  updateLocationCounts,
  WorkoutLocationsView,
  Workouts,
} from "../../../models/workout.server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const user = (await auth())?.user;
  if (!user) return new Response("Unauthorized", { status: 401 });

  await migrateStringLocationsToLocationCollection(user.id);

  return new Response("Hello, world!");
}

async function migrateStringLocationsToLocationCollection(
  userId: Session["user"]["id"],
) {
  console.log("Checking for workouts with deprecated text location");

  const legacyWorkoutsCount = await Workouts.countDocuments({
    location: { $exists: true },
    locationId: { $exists: false },
  });

  if (legacyWorkoutsCount) {
    console.log(
      `Found ${legacyWorkoutsCount} workouts with deprecated text location`,
    );

    const workouts = Workouts.find(
      {
        location: { $exists: true },
        locationId: { $exists: false },
      },
      // Oldest first, for approximate createdAt on the location document
      { sort: { workedOutAt: 1 } },
    );

    for await (const workout of workouts) {
      if (!workout.location) {
        console.warn(
          `Workout ${String(workout._id)} has falsy location, unsetting it and skipping`,
        );
        await Workouts.updateOne(
          { _id: workout._id },
          { $unset: { location: 1 } },
        );

        continue;
      }
      if (workout.locationId) {
        console.warn(
          `Workout ${String(workout._id)} already has a locationId, skipping [this should not happen]`,
        );
        continue;
      }

      console.log(
        `Updating workout ${String(workout._id)} with new locationId`,
      );

      let location = await Locations.findOne({ name: workout.location });

      if (!location) {
        console.warn(
          `No location found for workout ${String(workout._id)} with name "${workout.location}"`,
        );

        console.log(
          `Creating new location for workout ${String(workout._id)} with name "${workout.location}"`,
        );

        const { insertedId: newLocationId } = await Locations.insertOne({
          userId: workout.userId,
          name: workout.location,
          // Approximate createdAt based on the workout's workedOutAt
          createdAt: workout.workedOutAt,
          updatedAt: workout.workedOutAt,
        });

        location = await Locations.findOne({ _id: newLocationId });
      }

      if (!location) {
        console.error(
          `Failed to find or create location for workout ${String(workout._id)}`,
        );
        continue;
      }

      await Workouts.updateOne(
        { _id: workout._id },
        {
          $set: { locationId: location._id.toString() },
          $unset: { location: 1 },
        },
      );
    }

    console.log("Workouts updated successfully");
  } else {
    console.log("No workouts found with deprecated text location");
  }

  // Wipe out materialized location counts
  console.log("Wiping out user's location counts");
  await WorkoutLocationsView.deleteMany({ userId });

  // Recalculate location counts after migration
  console.log("Recalculating user's location counts");
  console.log(await updateLocationCounts(userId));
}
