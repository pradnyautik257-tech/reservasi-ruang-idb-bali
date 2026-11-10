import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEMO_MODE =
  process.env.DEMO_MODE === "true" ||
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  process.env.VERCEL === "1";

/**
 * Di Vercel atau saat DEMO_MODE=true, seluruh halaman aplikasi diarahkan ke
 * pengalaman demo client-side. Ini mencegah PGlite/database dijalankan pada
 * deployment statis/demo.
 */
export function proxy(request: NextRequest) {
  if (!DEMO_MODE) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/demo" || pathname.startsWith("/demo/")) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/demo", request.url));
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?)$).*)",
  ],
};
