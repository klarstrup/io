import "@fortawesome/fontawesome-svg-core/styles.css";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata, Viewport } from "next";
import AblyWrapper from "../AblyWrapper";
import { ApolloWrapper } from "../ApolloWrapper";
import UserStuff from "../components/UserStuff";
import "./page.css";
import { SerwistProvider } from "./serwist";
import { Suspense } from "react";
import LoadingIndicator from "./LoadingIndicator";

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
        <LoadingIndicator />
        <SerwistProvider swUrl="/serwist/sw.js">
          <ApolloWrapper>
            <AblyWrapper>
              <UserStuff />
              <Suspense>{children}</Suspense>
              <Analytics />
            </AblyWrapper>
          </ApolloWrapper>
        </SerwistProvider>
      </body>
    </html>
  );
}
