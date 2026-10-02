// src/lib/auth.ts
// Manajemen sesi: buat/baca/hapus JWT session via cookie httpOnly
// Auth hanya lewat OTP WhatsApp, tidak ada password

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "../../generated/prisma/client";

const SESSION_COOKIE_NAME = "skinsync_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari dalam detik

export interface SessionPayload {
  userId: number;
  role: Role;
  phone: string;
  name: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET wajib diisi minimal 32 karakter di environment variables"
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Buat JWT session token.
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

/**
 * Verifikasi dan decode JWT session token.
 * Mengembalikan null jika token tidak valid atau expired.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Set session cookie setelah login berhasil.
 * Dipanggil dari Server Function atau Route Handler.
 */
export async function setSessionCookie(session: SessionPayload): Promise<void> {
  const token = await createSessionToken(session);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/**
 * Baca session dari cookie request.
 * Gunakan di Server Components, Server Functions, Route Handlers.
 * Mengembalikan null jika tidak ada session valid.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Hapus session (logout).
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Require session — digunakan di Server Functions.
 * Melempar error 401 jika tidak ada session.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: silakan login terlebih dahulu");
  }
  return session;
}

/**
 * Require ADMIN atau SUPER_ADMIN.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: hanya admin yang diizinkan");
  }
  return session;
}

/**
 * Require SUPER_ADMIN.
 */
export async function requireSuperAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: hanya super admin yang diizinkan");
  }
  return session;
}
