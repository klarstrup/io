import type { Route } from "next";
import Link from "next/link";
import { BackButton } from "./BackButton";

export function Modal<R extends string>({
  className,
  children,
  dismissTo,
}: {
  className?: string;
  children: React.ReactNode;
  dismissTo?: Route<R>;
}) {
  return (
    <div className="max-h-vh fixed inset-0 z-20 flex items-center justify-center backdrop-blur-sm">
      <div
        className={
          "z-10 flex max-h-[95vh] max-w-[95vw] flex-col " + (className || "")
        }
      >
        {children}
      </div>
      {dismissTo ? (
        <Link href={dismissTo} className="absolute inset-0" />
      ) : (
        <BackButton className="absolute inset-0" />
      )}
    </div>
  );
}
