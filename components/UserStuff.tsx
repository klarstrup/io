import { Suspense } from "react";
import { GraphQLListener } from "./GraphQLListener";
import UserStuffLink from "./UserStuffLink";

export default function UserStuff() {
  return (
    <div
      className="fixed left-1/2 z-50 flex -translate-x-1/2 transform items-center gap-1 rounded-2xl border border-[yellow]/25 bg-white/10 px-2 py-1 backdrop-blur-md sm:gap-2 pointer-coarse:bottom-2 pointer-fine:top-4"
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
      <UserStuffLink href="/lists" prefetch={false}>
        ✅
      </UserStuffLink>
      <UserStuffLink href="/calendar" prefetch={false}>
        🗓️
      </UserStuffLink>
      <UserStuffLink
        href={"/events" as __next_route_internal_types__.RouteImpl<"/events">}
        prefetch={false}
      >
        🏅
      </UserStuffLink>
      <div className="h-7 w-[0.5px] rounded-full bg-[yellow]/50" />
      <UserStuffLink href="/user/workout-schedules" prefetch={false}>
        ⚙️
      </UserStuffLink>
      <UserStuffLink href="/user/sources" prefetch={false}>
        📡
      </UserStuffLink>
      <UserStuffLink href="/user/locations" prefetch={false}>
        📍
      </UserStuffLink>
      <UserStuffLink href="/user/settings" prefetch={false}>
        🌞
      </UserStuffLink>
    </div>
  );
}
