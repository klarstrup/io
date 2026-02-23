import { Account } from "next-auth";
import { proxyCollection } from "../utils.server";
import { IUser } from "./user";

export const Users = proxyCollection<IUser>("users");

export const Accounts = proxyCollection<Account>("accounts");
