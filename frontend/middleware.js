import { NextResponse } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/profile",
  "/settings",
  "/notifications",
  "/activity",
  "/analytics",
  "/admin",
  "/search",
];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get("accessToken")?.value;
  const role = request.cookies.get("role")?.value || "ceo";

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/dashboard/")) {
    const requestedRole = pathname.split("/")[2];
    if (requestedRole && requestedRole !== role && role !== "ceo") {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
  }

  if (pathname.startsWith("/admin") && role !== "ceo") {
    return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile",
    "/settings",
    "/notifications",
    "/activity",
    "/analytics",
    "/admin",
    "/search",
  ],
};
