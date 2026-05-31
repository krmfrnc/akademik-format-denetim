import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? "",
);

const PROTECTED_PATHS = [
  "/admin",
  "/documents",
  "/formats",
  "/settings",
  "/billing",
];

const PUBLIC_PATHS = ["/login", "/register"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname.startsWith(p));
}

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/api/")) return true;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.includes(".")) return true; // static files
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtected(pathname)) return NextResponse.next();

  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_ACCESS_SECRET);

    // Admin paths require ADMIN or SUPER_ADMIN role
    if (pathname.startsWith("/admin")) {
      const role = (payload.role as string) || "USER";
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/documents", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
