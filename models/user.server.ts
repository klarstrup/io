import { proxyCollection } from "../utils.server";
import { IUser } from "./user";

export const Users = proxyCollection<IUser>("users");
