import { Suspense } from "react";
import UserStuffSources from "../../../components/UserStuffSources";

export default function UserSourcesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      }
    >
      <UserStuffSources />
    </Suspense>
  );
}
