import { auth } from "../auth";
import { Locations } from "../models/location.server";
import { omit } from "../utils";
import UserStuffLocationsForm from "./UserStuffLocationsForm";

export default async function UserStuffLocations() {
  const user = (await auth())?.user;
  const locations = user
    ? await Locations.find({ userId: user.id }, { sort: { name: 1 } }).toArray()
    : [];

  return (
    <UserStuffLocationsForm
      user={user}
      locations={locations?.map((document) => ({
        ...omit(document, "_id"),
        id: document._id.toString(),
      }))}
    />
  );
}
