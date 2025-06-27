import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  if (
    request.nextUrl.hostname === "klarstrup.dk" &&
    (request.nextUrl.pathname === "/cv" ||
      request.nextUrl.pathname === "/cv.pdf")
  ) {
    return NextResponse.redirect(new URL("https://github.com/klarstrup"));
  }
}
