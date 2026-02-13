import { auth } from "../auth";
import { DataSource, dataSourceGroups } from "../sources/utils";
import UserStuffSourcesForm from "./UserStuffSourcesForm";

export default async function UserStuffSources() {
  const user = (await auth())?.user;

  if (!user) return null;

  return (
    <UserStuffSourcesForm
      sourceOptions={[
        ...dataSourceGroups.workouts,
        ...dataSourceGroups.events,
        ...dataSourceGroups.food,
        ...dataSourceGroups.weather,
        ...dataSourceGroups.health,
        DataSource.Songkick,
      ]}
    />
  );
}
