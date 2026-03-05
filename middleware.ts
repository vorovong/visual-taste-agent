import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // Dev-only auth bypass for testing
  if (process.env.SKIP_AUTH === "true") return NextResponse.next();

  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");
  const isPublicAsset =
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/screenshots") ||
    req.nextUrl.pathname === "/favicon.ico";

  if (isAuthApi || isPublicAsset) return NextResponse.next();
  if (isLoginPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }
  if (!isLoggedIn) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
