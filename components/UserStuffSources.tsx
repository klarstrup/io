import { authUser } from "../auth";
import { dataSources } from "../sources/utils";
import UserStuffSourcesForm from "./UserStuffSourcesForm";

export default async function UserStuffSources() {
  const user = await authUser();

  if (!user) return null;

  return (
    <UserStuffSourcesForm
      sourceOptions={Object.values(dataSources).map((ds) => ds.source)}
    />
  );
}
