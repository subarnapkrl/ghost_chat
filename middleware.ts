import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const correlationId =
    req.headers.get("x-correlation-id") ?? crypto.randomUUID();

  console.log(
    JSON.stringify({
      event: "http:request",
      method: req.method,
      path: pathname,
      correlationId,
      ts: new Date().toISOString(),
    }),
  );
  const isRootRoute = pathname === "/";

  const isLoggedIn = !!req.auth?.user;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth");

  const forwardedHeaders = new Headers(req.headers);
  forwardedHeaders.set("x-correlation-id", correlationId);

  function withCorrelationId(res: NextResponse): NextResponse {
    res.headers.set("x-correlation-id", correlationId);
    return res;
  }
  if (isRootRoute) {
    const target = isLoggedIn ? "/dashboard" : "/login";
    return withCorrelationId(
      NextResponse.redirect(new URL(target, req.nextUrl.origin)),
    );
  }
  if (isAuthRoute) {
    if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
      return withCorrelationId(
        NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin)),
      );
    }
    return withCorrelationId(
      NextResponse.next({ request: { headers: forwardedHeaders } }),
    );
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return withCorrelationId(NextResponse.redirect(loginUrl));
  }

  return withCorrelationId(
    NextResponse.next({ request: { headers: forwardedHeaders } }),
  );
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
