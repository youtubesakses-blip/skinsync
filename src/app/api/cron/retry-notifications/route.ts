// src/app/api/cron/retry-notifications/route.ts
// Cron job: retry notifikasi WA yang FAILED
// Dipanggil tiap 10 menit oleh cron Railway

import { type NextRequest } from "next/server";
import { retryFailedNotifications } from "@/server/services/notification";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await retryFailedNotifications();
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/retry-notifications]", error);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
