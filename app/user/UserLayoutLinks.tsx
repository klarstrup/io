import { twMerge } from "tailwind-merge";
import UserStuffLink from "../../components/UserStuffLink";

export function UserLayoutLinks({ className }: { className?: string }) {
  return (
    <div
      className={twMerge(
        `mx-2 mb-4 flex items-center justify-evenly gap-x-1 overflow-hidden border border-black/25 bg-[#edab00] px-1 py-2 backdrop-blur-lg pointer-coarse:rounded-t-2xl pointer-coarse:border-b-0 pointer-fine:rounded-b-2xl pointer-fine:border-t-0`,
        className,
      )}
    >
      <UserStuffLink href="/user/workout-schedules" prefetch={false}>
        ⚙️
      </UserStuffLink>
      <UserStuffLink href="/user/sources" prefetch={false}>
        📡
      </UserStuffLink>
      <UserStuffLink href="/user/locations" prefetch={false}>
        📍
      </UserStuffLink>
      <div className="h-7 w-[0.5px] rounded-full bg-[yellow]/50" />
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
    </div>
  );
}
