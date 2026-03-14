import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Redirect platform superadmins from /admin/* to /superadmin/admin/* so they
 * stay in the superadmin layout (same sidebar) instead of switching to dashboard layout.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const isSuperadmin =
    token?.isPlatformSuperadmin === true ||
    (typeof token?.email === "string" &&
      token.email.toLowerCase() === (process.env.SUPERADMIN_EMAIL ?? "simon@visionbuildingtechs.com").toLowerCase());

  if (isSuperadmin) {
    const rest = pathname.slice("/admin".length) || "/";
    const url = request.nextUrl.clone();
    url.pathname = `/superadmin/admin${rest}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
