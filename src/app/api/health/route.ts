// src/app/api/health/route.ts
// Healthcheck endpoint untuk Railway

import { db } from "@/lib/db";

export async function GET() {
  try {
    // Cek koneksi database
    await db.$queryRaw`SELECT 1`;

    return Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
