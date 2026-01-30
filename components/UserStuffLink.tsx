"use client";
import Link from "next/link";
import { Suspense } from "react";
import { UrlObject } from "url";
import UserStuffLinkActiveness from "./UserStuffLinkActiveness";

export default function UserStuffLink(props: {
  href: UrlObject | __next_route_internal_types__.RouteImpl<string>;
  children?: React.ReactNode;
}) {
  return (
    <Link
      prefetch={false}
      href={props.href}
      className="relative text-3xl xl:text-4xl"
    >
      <Suspense>
        <UserStuffLinkActiveness href={props.href}>
          {props.children}
        </UserStuffLinkActiveness>
      </Suspense>
      {props.children}
    </Link>
  );
}
