import { Suspense } from "react";
import { GraphQLListenerButItHasUserAlready } from "./GraphQLListenerButItHasUserAlready";
import Popover from "./Popover";
import UserStuffLink from "./UserStuffLink";
import UserStuffLocations from "./UserStuffLocations";
import UserStuffSettings from "./UserStuffSettings";
import UserStuffSources from "./UserStuffSources";
import UserStuffWorkoutSchedule from "./UserStuffWorkoutSchedule";

export default function UserStuff() {
  return (
    <div
      className="fixed left-1/2 z-50 flex -translate-x-1/2 transform items-center gap-1 rounded-2xl border border-[yellow]/25 bg-white/10 px-2 py-1 backdrop-blur-md sm:gap-2 pointer-coarse:bottom-2 pointer-fine:top-4"
      style={{
        boxShadow:
          "0 0 48px rgba(0, 0, 0, 0.5), 0 0 24px #edab00, 0 0 24px #edab00, 0 0 6px rgba(0, 0, 0, 1), 0 0 1px rgba(0, 0, 0, 1)",
      }}
    >
      <GraphQLListenerButItHasUserAlready />
      <UserStuffLink href="/diary">📔</UserStuffLink>
      <UserStuffLink href="/lists">✅</UserStuffLink>
      <UserStuffLink href="/calendar">🗓️</UserStuffLink>
      <UserStuffLink
        href={"/events" as __next_route_internal_types__.RouteImpl<"/events">}
      >
        🏅
      </UserStuffLink>
      <span className="text-3xl text-gray-400/25 xl:text-4xl">❘</span>
      <Popover control={<span className="text-3xl xl:text-4xl">⚙️</span>}>
        <div className="absolute left-1/2 z-30 max-h-[66vh] w-96 max-w-[88vw] -translate-x-1/2 overflow-auto overscroll-contain rounded-lg bg-[yellow] p-2 shadow-[black_0_0_20px] pointer-coarse:bottom-9 pointer-fine:top-9">
          <Suspense>
            <UserStuffWorkoutSchedule />
          </Suspense>
        </div>
      </Popover>
      <Popover control={<span className="text-3xl xl:text-4xl">📡</span>}>
        <div className="absolute left-1/2 z-30 max-h-[66vh] w-96 max-w-[88vw] -translate-x-1/2 overflow-auto overscroll-contain rounded-lg bg-[yellow] p-2 shadow-[black_0_0_20px] pointer-coarse:bottom-9 pointer-fine:top-9">
          <Suspense>
            <UserStuffSources />
          </Suspense>
        </div>
      </Popover>
      <Popover
        control={<span className="text-3xl xl:text-4xl">📍</span>}
        className="-mx-1"
      >
        <div className="absolute left-1/2 z-30 max-h-[66vh] w-140 max-w-[88vw] -translate-x-1/2 overflow-auto overscroll-contain rounded-lg bg-[yellow] p-2 shadow-[black_0_0_20px] pointer-coarse:bottom-9 pointer-fine:top-9">
          <Suspense>
            <UserStuffLocations />
          </Suspense>
        </div>
      </Popover>
      <Popover control={<span className="text-3xl xl:text-4xl">🌞</span>}>
        <div className="absolute left-1/2 z-30 max-h-[66vh] w-96 max-w-[88vw] -translate-x-1/2 overflow-auto overscroll-contain rounded-lg bg-[yellow] p-2 shadow-[black_0_0_20px] pointer-coarse:bottom-9 pointer-fine:top-9">
          <Suspense>
            <UserStuffSettings />
          </Suspense>
        </div>
      </Popover>
    </div>
  );
}
