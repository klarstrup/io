import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "../auth";
import { IUser } from "../models/user";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const useSession = authClient.useSession as () => Omit<
  ReturnType<typeof authClient.useSession>,
  "data"
> & {
  data:
    | (Omit<ReturnType<typeof authClient.useSession>["data"], "user"> & {
        user: IUser;
      })
    | null;
};
