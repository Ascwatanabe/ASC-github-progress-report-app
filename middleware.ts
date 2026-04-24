import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "pr_session";

export async function middleware(request: NextRequest) {
  const secret = process.env.JWT_SECRET;
  const token = request.cookies.get(COOKIE)?.value;
  let role: string | undefined;

  if (token && secret && secret.length >= 32) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      role = payload.role as string | undefined;
    } catch {
      /* invalid token */
    }
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      const u = request.nextUrl.clone();
      u.pathname = "/login";
      u.searchParams.set("next", pathname);
      return NextResponse.redirect(u);
    }
  }

  if (pathname === "/report" || pathname.startsWith("/report/")) {
    if (!role) {
      const u = request.nextUrl.clone();
      u.pathname = "/login";
      u.searchParams.set("next", pathname);
      return NextResponse.redirect(u);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/report", "/report/:path*"],
};
