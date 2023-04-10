import { Metadata } from "next";

export const metadata: Metadata = {
  title: "io of the klarstrups",
  description: "past and future ioctivities",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
