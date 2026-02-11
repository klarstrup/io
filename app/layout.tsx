import "@fortawesome/fontawesome-svg-core/styles.css";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { Suspense } from "react";
import AblyWrapper from "../AblyWrapper";
import { ApolloWrapper } from "../ApolloWrapper";
import UserStuff from "../components/UserStuff";
import LoadingIndicator from "./LoadingIndicator";
import "./page.css";
import { SerwistProvider } from "./serwist";

export const metadata: Metadata = {
  title: "io input/output",
  description: "what i've done",
};

export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
  minimumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <SerwistProvider swUrl="/serwist/sw.js">
            <ApolloWrapper>
              <AblyWrapper>
                <LoadingIndicator />
                <UserStuff />
                <Suspense>{children}</Suspense>
                <Analytics />
              </AblyWrapper>
            </ApolloWrapper>
          </SerwistProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
