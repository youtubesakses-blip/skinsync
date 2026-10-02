// src/app/api/auth/verify-otp/route.ts
// Endpoint verifikasi OTP dan set session cookie

import { type NextRequest } from "next/server";
import { verifyOtpSchema } from "@/lib/validators/auth";
import { verifyOtp } from "@/server/services/auth";
import { setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Batasi 30 verifikasi/menit per IP (brute-force OTP sudah dibatasi
  // 5x salah per kode di service, ini lapisan tambahan per IP).
  const ipLimit = checkRateLimit(`otp:verify:ip:${getClientIp(request)}`, 30, 60);
  if (!ipLimit.allowed) {
    return Response.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body tidak valid" }, { status: 400 });
  }

  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Validasi gagal" },
      { status: 400 }
    );
  }

  const result = await verifyOtp(parsed.data.phone, parsed.data.otp);

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 401 });
  }

  // Ambil data user untuk session
  const user = await db.user.findUnique({ where: { id: result.userId! } });
  if (!user) {
    return Response.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  // Set session cookie httpOnly
  await setSessionCookie({
    userId: user.id,
    role: user.role,
    phone: user.phone,
    name: user.name,
  });

  return Response.json({
    success: true,
    isNewUser: result.isNewUser,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
    },
  });
}
