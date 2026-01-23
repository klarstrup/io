import { Analytics } from "@vercel/analytics/react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { ApolloWrapper } from "../ApolloWrapper";
import UserStuff from "../components/UserStuff";
import "./page.css";

export const metadata: Metadata = {
  title: "io input/output",
  description: "what i've done",
};

export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
  minimumScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ApolloWrapper headers={await headers()}>
      <html lang="en">
        <body>
          <UserStuff />
          {children}
          <Analytics />
        </body>
      </html>
    </ApolloWrapper>
  );
}
