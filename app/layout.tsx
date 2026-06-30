import "@fortawesome/fontawesome-svg-core/styles.css";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { Suspense } from "react";
import AblyWrapper from "../AblyWrapper";
import { ApolloWrapper } from "../ApolloWrapper";
import UserStuff from "../components/UserStuff";
import LoadingIndicator from "./LoadingIndicator";
import "./page.css";
import { SerwistProvider } from "./serwist";
import Backdrop from "./Backdrop";

export const metadata = {
  title:
    process.env.NODE_ENV === "production"
      ? "io input/output"
      : "👩🏻‍🔬 io input/output",
  description: "what i've done",
} satisfies Metadata;

export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
  minimumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="overflow-y-scroll lg:overflow-x-scroll lg:overflow-y-hidden"
    >
      <body className="flex flex-col">
        <SessionProvider>
          <SerwistProvider swUrl="/serwist/sw.js">
            <ApolloWrapper>
              <AblyWrapper>
                <LoadingIndicator />
                <Suspense>
                  <UserStuff />
                  {children}
                  <Backdrop />
                </Suspense>
                <Analytics />
              </AblyWrapper>
            </ApolloWrapper>
          </SerwistProvider>
        </SessionProvider>
        <div id="modal-root" />
      </body>
    </html>
  );
}
