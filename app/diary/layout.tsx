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
      {entry}
    </>
  );
}
