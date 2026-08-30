"use client";
import { useApolloClient } from "@apollo/client/react";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import DashBar from "../app/diary/DashBar";
import { UserLayoutLinks } from "../app/user/UserLayoutLinks";
import { GraphQLListener } from "./GraphQLListener";
import UserStuffLink from "./UserStuffLink";

export default function UserStuff() {
  const currentHref = usePathname();
  const [isSettingsBarOpen, setIsSettingsBarOpen] = useState(false);

  useEffect(() => {
    if (currentHref !== "/user/settings") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSettingsBarOpen(false);
    }
  }, [currentHref]);

  const client = useApolloClient();

  return (
    <div
      className="fixed left-1/2 z-50 flex max-w-[calc(100%-2.5rem)] -translate-x-1/2 transform items-center gap-x-2 rounded-2xl border border-[yellow]/25 bg-white/10 py-0.5 pr-0 pl-2 backdrop-blur-md sm:gap-2 lg:z-6 pointer-coarse:bottom-2 pointer-fine:top-4"
      style={{
        boxShadow:
          "0 0 48px rgba(0, 0, 0, 0.5), 0 0 24px #edab00, 0 0 24px #edab00, 0 0 6px rgba(0, 0, 0, 1), 0 0 1px rgba(0, 0, 0, 1)",
      }}
    >
      <Suspense>
        <GraphQLListener />
      </Suspense>
      <UserStuffLink
        href="/diary"
        onClick={(e) => {
          if (currentHref === "/diary" || currentHref === "/") {
            e.preventDefault();

            const nowDivider =
              document.querySelector<HTMLElement>(".now-divider");
            const el = nowDivider?.closest<HTMLElement>(
              ".diary-agenda-day-entry",
            )?.parentElement;
            if (!el) return;

            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const elVerticalCenter = el.offsetTop + el.offsetHeight / 2;
            const elHorizontalCenter = el.offsetLeft + el.offsetWidth / 2;
            const scrollTop = window.scrollY;
            const scrollLeft = window.scrollX;
            nowDivider.scrollIntoView();
            window.scrollTo(
              elHorizontalCenter - viewportWidth / 2 + el.offsetWidth / 2,
              elVerticalCenter - viewportHeight / 2,
            );

            // If we are already roughly scrolled to the right place, refetch active queries
            if (
              Math.abs(scrollTop - window.scrollY) < 10 &&
              Math.abs(scrollLeft - window.scrollX) < 10
            ) {
              void client.refetchQueries({ include: "active" });
            }
          }
        }}
      >
        📔
      </UserStuffLink>
      <UserStuffLink
        href="/user/settings"

        onClick={(e) => {
          e.preventDefault();
          setIsSettingsBarOpen((s) => !s);
        }}
      >
        🌞
      </UserStuffLink>
      <div className="flex-1 overflow-auto">
        <Suspense fallback={<div className="min-h-12.5 min-w-xs" />}>
          <DashBar />
        </Suspense>
      </div>
      {isSettingsBarOpen && (
        <div className="absolute left-1/2 z-100 w-[95%] -translate-x-1/2 transform pointer-coarse:bottom-full pointer-fine:top-full">
          <UserLayoutLinks className="m-0" />
        </div>
      )}
    </div>
  );
}
