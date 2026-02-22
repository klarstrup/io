import { Suspense } from "react";
import { twMerge } from "tailwind-merge";
import DashBar from "../app/diary/DashBar";
import { GraphQLListener } from "./GraphQLListener";
import UserStuffLink from "./UserStuffLink";

export default function UserStuff() {
  return (
    <div
      className="fixed left-1/2 z-50 flex max-w-[calc(100%-0.5rem)] -translate-x-1/2 transform items-center gap-x-2 rounded-2xl border border-[yellow]/25 bg-white/10 py-0.5 pr-0 overflow-hidden pl-2 backdrop-blur-md sm:gap-2 pointer-coarse:bottom-2 pointer-fine:top-4"
      style={{
        boxShadow:
          "0 0 48px rgba(0, 0, 0, 0.5), 0 0 24px #edab00, 0 0 24px #edab00, 0 0 6px rgba(0, 0, 0, 1), 0 0 1px rgba(0, 0, 0, 1)",
      }}
    >
      <Suspense>
        <GraphQLListener />
      </Suspense>
      <UserStuffLink href="/diary" prefetch={false}>
        📔
      </UserStuffLink>
      <UserStuffLink href="/user/settings" prefetch={false}>
        🌞
      </UserStuffLink>
      <Suspense
        fallback={
          <div
            className={twMerge(
              "select-none",
              "gap-x-2 gap-y-0.5 overflow-auto",
              "grid auto-cols-auto grid-flow-col-dense grid-cols-[repeat(auto-fit,1fr)] grid-rows-2",
            )}
          />
        }
      >
        <DashBar />
      </Suspense>
    </div>
  );
}
