// src/app/api/auth/request-otp/route.ts
// Endpoint request OTP

import { type NextRequest } from "next/server";
import { requestOtpSchema } from "@/lib/validators/auth";
import { requestOtp } from "@/server/services/auth";
import { normalizePhone, isValidPhone } from "@/lib/phone";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Proteksi ganda di atas rate limit bisnis (cooldown 60 dtk, 5/jam per nomor):
  // batasi 20 request/menit per IP agar endpoint tidak disalahgunakan.
  const ipLimit = checkRateLimit(`otp:request:ip:${getClientIp(request)}`, 20, 60);
  if (!ipLimit.allowed) {
    return Response.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body tidak valid" }, { status: 400 });
  }

  const parsed = requestOtpSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Validasi gagal" },
      { status: 400 }
    );
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!isValidPhone(phone)) {
    return Response.json(
      { error: "Format nomor HP tidak valid. Gunakan format: 08xx atau +62xx" },
      { status: 400 }
    );
  }

  const result = await requestOtp(parsed.data.phone);

  if (!result.success) {
    return Response.json(
      { error: result.error, cooldownSeconds: result.cooldownSeconds },
      { status: 429 }
    );
  }

  return Response.json({ success: true, message: "OTP dikirim via WhatsApp" });
}
