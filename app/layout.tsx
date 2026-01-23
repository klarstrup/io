import { Analytics } from "@vercel/analytics/react";
import type { Metadata, Viewport } from "next";
import { ApolloWrapper } from "../ApolloWrapper";
import UserStuff from "../components/UserStuff";
import { GraphQLTestRSC } from "./GraphQLTestRSC";
import { GraphQLTestSSR } from "./GraphQLTestSSR";
import "./page.css";

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
    <ApolloWrapper>
      <html lang="en">
        <body>
          <GraphQLTestRSC />
          <GraphQLTestSSR />
          <UserStuff />
          {children}
          <Analytics />
        </body>
      </html>
    </ApolloWrapper>
  );
}
