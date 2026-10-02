// src/app/api/admin/orders/[id]/status/route.ts
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendWhatsApp } from "@/server/services/notification";
import { rollbackVoucher } from "@/server/services/voucher";
import type { OrderStatus } from "../../../../../../../generated/prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orderId = parseInt(id, 10);

  try {
    const body = await request.json();
    const { status: targetStatus, note, courierName, trackingNumber, adminNote } = body;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: true },
    });

    if (!order) {
      return Response.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    const currentStatus = order.status;

    // Validasi alur status pesanan sesuai plan.md 6.6:
    // PENDING_PAYMENT -> PAID -> PROCESSING -> SHIPPED -> COMPLETED
    // CANCELLED boleh dari PENDING_PAYMENT, PAID, PROCESSING
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING_PAYMENT: ["PAID", "CANCELLED", "EXPIRED"],
      PAID: ["PROCESSING", "CANCELLED"],
      PROCESSING: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["COMPLETED"],
      COMPLETED: [],
      EXPIRED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus as OrderStatus)) {
      return Response.json(
        { error: `Transisi status dari ${currentStatus} ke ${targetStatus} tidak diizinkan` },
        { status: 400 }
      );
    }

    // Jika SHIPPED: wajib ada courierName dan trackingNumber
    if (targetStatus === "SHIPPED") {
      if (!courierName?.trim() || !trackingNumber?.trim()) {
        return Response.json(
          { error: "Nama kurir dan nomor resi wajib diisi untuk status SHIPPED" },
          { status: 400 }
        );
      }
    }

    const now = new Date();

    await db.$transaction(async (tx) => {
      // Update Order
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: targetStatus as OrderStatus,
          courierName: courierName?.trim() || order.courierName,
          trackingNumber: trackingNumber?.trim() || order.trackingNumber,
          adminNote: adminNote !== undefined ? adminNote : order.adminNote,
          shippedAt: targetStatus === "SHIPPED" ? now : order.shippedAt,
          completedAt: targetStatus === "COMPLETED" ? now : order.completedAt,
        },
      });

      // Catat riwayat status
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: currentStatus,
          toStatus: targetStatus as OrderStatus,
          note: note || `Status diubah oleh admin (${session.name})`,
          changedBy: session.userId,
        },
      });

      // Jika CANCELLED dari PENDING_PAYMENT / PAID / PROCESSING: kembalikan stok & voucher
      if (targetStatus === "CANCELLED") {
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
              note: `Pembatalan manual oleh admin (${session.name})`,
              createdBy: session.userId,
            },
          });
        }

        if (order.voucherId) {
          await rollbackVoucher(order.id, order.voucherId, tx);
        }
      }

      // Catat AuditLog
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "UPDATE_ORDER_STATUS",
          entityType: "Order",
          entityId: order.id,
          oldValues: { status: currentStatus },
          newValues: { status: targetStatus, courierName, trackingNumber },
        },
      });
    });

    // Kirim notifikasi WA jika SHIPPED
    if (targetStatus === "SHIPPED") {
      await sendWhatsApp(
        order.user.phone,
        "order_shipped",
        {
          name: order.user.name,
          orderNumber: order.orderNumber,
          courier: courierName.trim(),
          trackingNumber: trackingNumber.trim(),
        },
        order.id
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui status pesanan";
    return Response.json({ error: message }, { status: 500 });
  }
}
