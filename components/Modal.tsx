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
    <div className="fixed inset-0 z-20 flex max-h-vh items-center justify-center backdrop-blur-sm">
      <div className="z-10 flex max-h-[95vh] max-w-[95vw] flex-col">
        {children}
      </div>
      <Link href={dismissTo} className="absolute inset-0" />
    </div>
  );
}
