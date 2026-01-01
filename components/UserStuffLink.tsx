"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UrlObject } from "url";

export default function UserStuffLink(props: {
  href: UrlObject | __next_route_internal_types__.RouteImpl<string>;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <Link
      prefetch={false}
      href={props.href}
      className="relative text-3xl xl:text-4xl"
    >
      {pathname.startsWith(String(props.href)) ? (
        <>
          <span className="absolute left-0 -z-10 blur-sm invert">
            {props.children}
          </span>
          <span className="absolute left-0 -z-10 blur-xs invert">
            {props.children}
          </span>
        </>
      ) : null}
      {props.children}
    </Link>
  );
}
