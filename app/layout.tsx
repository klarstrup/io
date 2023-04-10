import { Metadata } from "next";

export const metadata: Metadata = {
  title: "io input/output",
  description: "what i've done",
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
