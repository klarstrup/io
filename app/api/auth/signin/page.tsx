"use client";

import { authClient } from "../../../../lib/auth-client";

export default function AuthPage() {
  return (
    <>
      <h1>Authentication Page</h1>
      <p>Please sign in to continue.</p>
      <button onClick={() => authClient.signIn.social({ provider: "github" })}>
        Sign In GitHub
      </button>
      <button onClick={() => authClient.signIn.social({ provider: "google" })}>
        Sign In Google
      </button>
    </>
  );
}
