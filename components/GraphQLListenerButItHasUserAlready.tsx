import { auth } from "../auth";
import { GraphQLListener } from "./GraphQLListener";

export async function GraphQLListenerButItHasUserAlready() {
  const user = (await auth())?.user;

  return user ? <GraphQLListener userId={user.id} /> : null;
}
