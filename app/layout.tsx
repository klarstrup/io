import { Analytics } from "@vercel/analytics/react";
import type { Metadata, Viewport } from "next";
import { ApolloWrapper } from "../ApolloWrapper";
import UserStuff from "../components/UserStuff";
import "./page.css";
import AblyWrapper from "../AblyWrapper";

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
    <ApolloWrapper>
      <AblyWrapper>
        <html lang="en">
          <body>
            <UserStuff />
            {children}
            <Analytics />
          </body>
        </html>
      </AblyWrapper>
    </ApolloWrapper>
  );
}
