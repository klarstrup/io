import "@fortawesome/fontawesome-svg-core/styles.css";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { Suspense } from "react";
import AblyWrapper from "../AblyWrapper";
import { ApolloWrapper } from "../ApolloWrapper";
import UserStuff from "../components/UserStuff";
import BackdropPNG from "../public/bg-desktop.png";
import Backdrop from "./Backdrop";
import LoadingIndicator from "./LoadingIndicator";
import "./page.css";

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

export const DYNAMIC_BACKDROP = false;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="relative flex flex-col">
        <ApolloWrapper>
          <AblyWrapper>
            <LoadingIndicator />
            <Suspense>
              <UserStuff />
              {children}
            </Suspense>
            {DYNAMIC_BACKDROP ? (
              <Backdrop />
            ) : (
              <Image
                src={BackdropPNG}
                alt="Backdrop"
                placeholder="blur"
                unoptimized
                fill
                className="pointer-events-none fixed! inset-0 -z-10 object-cover select-none"
              />
            )}
            <Analytics />
          </AblyWrapper>
        </ApolloWrapper>
        <div id="modal-root" />
      </body>
    </html>
  );
}
