// src/app/api/cron/expire-orders/route.ts
// Cron job: expire pesanan yang belum dibayar
// Dipanggil tiap 5 menit oleh cron Railway dengan header CRON_SECRET

import { type NextRequest } from "next/server";
import { expireOverdueOrders } from "@/server/services/order";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const expiredCount = await expireOverdueOrders();
    return Response.json({
      success: true,
      expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/expire-orders]", error);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
