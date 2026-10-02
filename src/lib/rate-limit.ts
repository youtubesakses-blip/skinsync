// src/lib/rate-limit.ts
// Rate limiting sederhana berbasis memori (fixed window).
// Catatan: hanya efektif untuk single-instance. Untuk multi-instance di Railway,
// gunakan store eksternal (mis. Redis/Upstash). Cukup untuk proteksi dasar
// endpoint auth & webhook sesuai plan Fase 8.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bersihkan bucket kadaluarsa setiap 5 menit agar Map tidak membesar.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAfterSeconds: number;
}

/**
 * Cek dan catat 1 hit untuk key dalam window tertentu.
 * @param key Identitas unik, mis. `otp:item:...` atau `ip:...`
 * @param limit Maksimal hit per window
 * @param windowSeconds Panjang window dalam detik
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, resetAfterSeconds: windowSeconds };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/**
 * Ambil IP client dari header (mendukung reverse proxy Railway).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
