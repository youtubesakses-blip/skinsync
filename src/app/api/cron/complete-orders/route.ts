// src/app/api/cron/complete-orders/route.ts
// Cron job: auto-complete pesanan yang sudah SHIPPED lebih dari 7 hari
// Dipanggil harian oleh cron Railway

import { type NextRequest } from "next/server";
import { autoCompleteOrders } from "@/server/services/order";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const completedCount = await autoCompleteOrders();
    return Response.json({
      success: true,
      completedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/complete-orders]", error);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
