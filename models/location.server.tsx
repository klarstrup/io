import { ObjectId } from "mongodb";
import { proxyCollection } from "../utils.server";
import { LocationData } from "./location";

export const Locations = proxyCollection<LocationData>("locations");

export const ensureLocation = async (
  userId: string,
  locationIdOrName: string,
) => {
  let locationId = locationIdOrName;
  if (locationId) {
    const newLocationName = locationId.trim();
    const location = await Locations.findOne(
      ObjectId.isValid(locationId)
        ? { _id: new ObjectId(locationId) }
        : { name: newLocationName, userId },
    );

    if (!location) {
      const name = newLocationName;
      const now = new Date();
      const newLocation = await Locations.insertOne({
        name,
        userId,
        createdAt: now,
        updatedAt: now,
      });
      locationId = newLocation.insertedId.toString();
    } else {
      locationId = location._id.toString();
    }
  }
  return locationId;
};
