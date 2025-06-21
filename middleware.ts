import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // ❌ Belum login tapi mau ke dashboard → redirect ke login
  if (!session && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ✅ Sudah login tapi masih buka /login, /register, atau / → redirect ke dashboard
  if (
    session &&
    (pathname === "/" || pathname === "/login" || pathname === "/register")
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

// ✅ Tentukan route yang akan diawasi oleh middleware
export const config = {
  matcher: ["/", "/login", "/register", "/dashboard/:path*"],
};