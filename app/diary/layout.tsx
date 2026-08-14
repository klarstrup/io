import { Suspense } from "react";

export default function Layout({
  children,
  entry,
}: {
  children: React.ReactNode;
  entry: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Suspense>{entry}</Suspense>
    </>
  );
}
