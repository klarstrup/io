"use client";
import { usePathname } from "next/navigation";
import { UrlObject } from "url";

export default function UserStuffLinkActiveness(props: {
  href: UrlObject | __next_route_internal_types__.RouteImpl<string>;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();

  if (
    !pathname.startsWith(
      typeof props.href === "string" ? props.href : props.href.href || "",
    )
  )
    return null;

  return (
    <>
      <span className="absolute left-0 -z-10 blur-sm invert">
        {props.children}
      </span>
      <span className="absolute left-0 -z-10 blur-xs invert">
        {props.children}
      </span>
    </>
  );
}
