import { auth } from "../auth";
import { dataSources } from "../sources/utils";
import UserStuffSourcesForm from "./UserStuffSourcesForm";

export default async function UserStuffSources() {
  const user = (await auth())?.user;

  if (!user) return null;

  return (
    <UserStuffSourcesForm
      sourceOptions={Object.values(dataSources).map((ds) => ds.source)}
    />
  );
}
