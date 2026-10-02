// src/proxy.ts
// Proxy (pengganti middleware) — proteksi rute berdasarkan peran
// Next.js 16: middleware.ts sudah deprecated, sekarang pakai proxy.ts dengan ekspor named "proxy"

import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";

// Rute yang hanya boleh diakses ADMIN atau SUPER_ADMIN
const ADMIN_PATHS = ["/admin"];

// Rute yang hanya boleh diakses SUPER_ADMIN
const SUPER_ADMIN_ONLY_PATHS = ["/admin/users", "/admin/settings"];

// Rute yang wajib login (semua peran)
const AUTH_REQUIRED_PATHS = ["/checkout", "/cart", "/account"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Baca session dari cookie
  const token = request.cookies.get("skinsync_session")?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Cek rute SUPER_ADMIN
  const isSuperAdminOnly = SUPER_ADMIN_ONLY_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (isSuperAdminOnly) {
    if (!session || session.role !== "SUPER_ADMIN") {
      if (!session) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // Cek rute ADMIN
  const isAdminPath = ADMIN_PATHS.some((path) => pathname.startsWith(path));

  if (isAdminPath) {
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      if (!session) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
      // Login tapi bukan admin — redirect ke beranda
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Cek rute yang wajib login
  const isAuthRequired = AUTH_REQUIRED_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (isAuthRequired && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Jika sudah login dan mengakses halaman login — redirect ke beranda
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Matchers untuk semua rute kecuali static files dan API images
    "/((?!_next/static|_next/image|favicon.ico|api/images|public).*)",
  ],
};
