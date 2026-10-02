// src/app/api/webhooks/midtrans/route.ts
// Webhook Midtrans — verifikasi signature, idempotensi, update status pembayaran

import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyMidtransSignature } from "@/lib/midtrans";
import { sendWhatsApp } from "@/server/services/notification";
import { rollbackVoucher } from "@/server/services/voucher";
import { formatRupiah } from "@/lib/money";
import type { OrderStatus, PaymentStatus, Prisma } from "../../../../../generated/prisma/client";

interface MidtransWebhookPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  transaction_status: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
  signature_key?: string;
  [key: string]: unknown;
}

function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string
): { orderStatus: OrderStatus; paymentStatus: PaymentStatus } | null {
  if (
    transactionStatus === "settlement" ||
    (transactionStatus === "capture" && fraudStatus === "accept")
  ) {
    return { orderStatus: "PAID", paymentStatus: "PAID" };
  }
  if (transactionStatus === "pending") {
    return { orderStatus: "PENDING_PAYMENT", paymentStatus: "PENDING" };
  }
  if (transactionStatus === "expire") {
    return { orderStatus: "EXPIRED", paymentStatus: "EXPIRED" };
  }
  if (
    transactionStatus === "cancel" ||
    transactionStatus === "deny" ||
    transactionStatus === "failure"
  ) {
    return { orderStatus: "CANCELLED", paymentStatus: "FAILED" };
  }
  return null;
}

export async function POST(request: NextRequest) {
  let payload: MidtransWebhookPayload;

  try {
    payload = (await request.json()) as MidtransWebhookPayload;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const {
    order_id,
    status_code,
    gross_amount,
    transaction_status,
    fraud_status,
    transaction_id,
    payment_type,
    signature_key,
  } = payload;

  // 1. Verifikasi signature — signature_key WAJIB ada dan valid (plan 6.5)
  if (!signature_key) {
    await db.paymentWebhookLog.create({
      data: {
        eventKey: `${order_id}:${transaction_status}:${transaction_id ?? ""}`,
        payload: payload as unknown as Prisma.InputJsonValue,
        isValid: false,
      },
    });
    return new Response("Missing signature", { status: 403 });
  }

  const isValid = await verifyMidtransSignature(
    order_id,
    status_code,
    gross_amount,
    signature_key
  );

  if (!isValid) {
    await db.paymentWebhookLog.create({
      data: {
        eventKey: `${order_id}:${transaction_status}:${transaction_id ?? ""}`,
        payload: payload as unknown as Prisma.InputJsonValue,
        isValid: false,
      },
    });
    return new Response("Forbidden", { status: 403 });
  }

  // 2. Idempoten check
  const eventKey = `${order_id}:${transaction_status}:${transaction_id ?? ""}`;
  const existingLog = await db.paymentWebhookLog.findUnique({
    where: { eventKey },
  });

  if (existingLog) {
    // Sudah diproses — balas 200 tanpa proses ulang
    return Response.json({ status: "already_processed" });
  }

  // Simpan log webhook
  const webhookLog = await db.paymentWebhookLog.create({
    data: {
      eventKey,
      payload: payload as unknown as Prisma.InputJsonValue,
      isValid: true,
    },
  });

  // 3. Cari order dan payment
  const order = await db.order.findUnique({
    where: { orderNumber: order_id },
    include: { user: true, items: true },
  });

  if (!order) {
    return Response.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  const payment = await db.payment.findUnique({
    where: { midtransOrderId: order_id },
  });

  if (!payment) {
    return Response.json({ error: "Payment tidak ditemukan" }, { status: 404 });
  }

  // 4. Verifikasi gross_amount cocok
  if (parseInt(gross_amount) !== payment.amount) {
    console.error(
      `[webhook] Amount mismatch: expected ${payment.amount}, got ${gross_amount}`
    );
    return new Response("Amount mismatch", { status: 400 });
  }

  const statusMapping = mapMidtransStatus(transaction_status, fraud_status);
  if (!statusMapping) {
    return Response.json({ status: "ignored" });
  }

  const { orderStatus, paymentStatus } = statusMapping;
  const now = new Date();

  // Guard anti-downgrade: webhook hanya boleh mengubah Order yang masih
  // PENDING_PAYMENT (plan 6.6). Webhook yang datang terlambat (mis. "pending"/
  // "expire" setelah order sudah PAID/EXPIRED) tidak boleh memundurkan status
  // atau mengembalikan stok dua kali. Payment record tetap diupdate.
  const shouldTransitionOrder = order.status === "PENDING_PAYMENT";

  // 5 & 6. Update dalam satu transaksi
  await db.$transaction(async (tx) => {
    // Update Payment (selalu, mencerminkan state terbaru dari Midtrans)
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        paymentType: payment_type,
        paidAt: paymentStatus === "PAID" ? now : undefined,
        rawResponse: payload as unknown as Prisma.InputJsonValue,
      },
    });

    // Update status Order hanya dari PENDING_PAYMENT
    if (shouldTransitionOrder && order.status !== orderStatus) {
      await tx.order.update({
        where: { id: order.id },
        data: { status: orderStatus },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: orderStatus,
          note: `Pembayaran: ${transaction_status}`,
        },
      });
    }

    // Jika EXPIRED atau CANCELLED dari PENDING_PAYMENT: kembalikan stok & voucher
    if (
      shouldTransitionOrder &&
      (orderStatus === "EXPIRED" || orderStatus === "CANCELLED")
    ) {
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.qty } },
        });

        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            type: "RELEASE",
            qty: item.qty,
            referenceType: "order",
            referenceId: order.id,
            note: `Pengembalian stok dari webhook Midtrans: ${transaction_status}`,
          },
        });
      }

      if (order.voucherId) {
        await rollbackVoucher(order.id, order.voucherId, tx);
      }
    }
  });

  // Tandai log webhook sudah diproses
  await db.paymentWebhookLog.update({
    where: { id: webhookLog.id },
    data: { processedAt: now },
  });

  // 7. Kirim notifikasi WA hanya saat terjadi transisi (hindari WA ganda)
  const transitionedToPaid = shouldTransitionOrder && orderStatus === "PAID";
  const transitionedToExpired = shouldTransitionOrder && orderStatus === "EXPIRED";

  if (transitionedToPaid) {
    await sendWhatsApp(
      order.user.phone,
      "payment_received",
      {
        name: order.user.name,
        orderNumber: order.orderNumber,
        total: formatRupiah(order.grandTotal),
      },
      order.id
    );
  } else if (transitionedToExpired) {
    await sendWhatsApp(
      order.user.phone,
      "order_expired",
      { name: order.user.name, orderNumber: order.orderNumber },
      order.id
    );
  }

  return Response.json({ status: "processed" });
}
