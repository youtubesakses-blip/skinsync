import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gambar produk disajikan lewat proxy lokal /api/images/** (Railway Bucket
  // privat) dan sudah dioptimasi ke WebP saat upload, jadi komponen memakai
  // next/image dengan `unoptimized` — tidak perlu remotePatterns.
  // Catatan deploy Railway (plan 8.2): migrasi DB otomatis dijalankan lewat
  // `npm start` (prisma migrate deploy), healthcheck di /api/health.
};

export default nextConfig;
