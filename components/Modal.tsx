import type { Route } from "next";
import Link from "next/link";

export function Modal<R extends string>({
  children,
  dismissTo,
}: {
  children: React.ReactNode;
  dismissTo: Route<R>;
}) {
  return (
    <div className="fixed inset-0 z-20 flex max-h-dvh items-center justify-center backdrop-blur-sm">
      <div className="z-10 flex max-h-[95dvh] max-w-[95dvw] flex-col">
        {children}
      </div>
      <Link href={dismissTo} className="absolute inset-0" />
    </div>
  );
}
