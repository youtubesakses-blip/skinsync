// src/app/api/orders/[orderNumber]/pay/route.ts
// Regenerasi Snap token untuk order PENDING_PAYMENT yang tokennya belum ada / kedaluwarsa.
// Dipakai tombol "Bayar Sekarang" di halaman detail order.

import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSnapTransaction } from "@/lib/midtrans";

interface RouteParams {
  params: Promise<{ orderNumber: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { orderNumber } = await params;

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!order || order.userId !== session.userId) {
    return Response.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
  }

  if (order.status !== "PENDING_PAYMENT") {
    return Response.json({ error: `Pesanan sudah ${order.status}` }, { status: 400 });
  }

  const existing = order.payments[0];
  // Kalau token masih ada, pakai ulang agar tidak bentrok order_id di Midtrans.
  if (existing?.snapToken && existing?.redirectUrl) {
    return Response.json({
      success: true,
      snapToken: existing.snapToken,
      redirectUrl: existing.redirectUrl,
      reused: true,
    });
  }

  try {
    const user = await db.user.findUnique({ where: { id: order.userId } });

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const startTimeStr =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} +0700`;

    // SENGAJA tanpa item_details (lihat penjelasan di services/order.ts):
    // menghindari "Name is too long" dan "gross_amount is not equal to sum of item_details".
    const snap = await createSnapTransaction({
      transaction_details: { order_id: order.orderNumber, gross_amount: order.grandTotal },
      customer_details: {
        first_name: (user?.name ?? "Pelanggan").slice(0, 20),
        phone: user?.phone ?? "",
      },
      expiry: { start_time: startTimeStr, unit: "hour" as const, duration: 24 },
    });

    if (existing) {
      await db.payment.update({
        where: { id: existing.id },
        data: { snapToken: snap.token, redirectUrl: snap.redirect_url, amount: order.grandTotal, status: "PENDING" },
      });
    } else {
      await db.payment.create({
        data: {
          orderId: order.id,
          midtransOrderId: order.orderNumber,
          snapToken: snap.token,
          redirectUrl: snap.redirect_url,
          amount: order.grandTotal,
          status: "PENDING",
          expiresAt: order.expiresAt,
        },
      });
    }

    return Response.json({ success: true, snapToken: snap.token, redirectUrl: snap.redirect_url });
  } catch (error) {
    console.error("[orders/pay] Gagal regenerasi Snap:", error);
    const message = error instanceof Error ? error.message : "Gagal membuat link pembayaran";
    return Response.json({ error: message }, { status: 500 });
  }
}
