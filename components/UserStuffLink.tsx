import Link from "next/link";
import { Suspense } from "react";
import { twMerge } from "tailwind-merge";
import { UrlObject } from "url";
import UserStuffLinkActiveness from "./UserStuffLinkActiveness";

export default function UserStuffLink({
  href,
  children,
  ...linkProps
}: {
  href: UrlObject | __next_route_internal_types__.RouteImpl<string>;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<typeof Link>, "href">) {
  return (
    <Link
      href={href}
      {...linkProps}
      className={twMerge("relative text-3xl xl:text-4xl", linkProps.className)}
    >
      <Suspense>
        <UserStuffLinkActiveness href={href}>
          {children}
        </UserStuffLinkActiveness>
      </Suspense>
      {children}
    </Link>
  );
}
