// src/app/api/admin/stock/adjust/route.ts
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { stockAdjustSchema } from "@/lib/validators/product";

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = stockAdjustSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Input tidak valid" }, { status: 400 });
    }

    const { variantId, qty, type, note } = parsed.data;

    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant) {
      return Response.json({ error: "Varian tidak ditemukan" }, { status: 404 });
    }

    const oldStock = variant.stock;
    let newStock = oldStock;

    if (type === "IN") {
      newStock = oldStock + Math.abs(qty);
    } else if (type === "OUT") {
      newStock = Math.max(0, oldStock - Math.abs(qty));
    } else if (type === "ADJUST") {
      newStock = Math.max(0, qty); // Set stok langsung ke nilai qty
    }

    const movementQty = Math.abs(newStock - oldStock);

    await db.$transaction(async (tx) => {
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
      });

      await tx.stockMovement.create({
        data: {
          variantId,
          type: type === "ADJUST" ? "ADJUST" : type === "IN" ? "IN" : "OUT",
          qty: movementQty,
          referenceType: "manual",
          note: note || `Penyesuaian stok manual oleh ${session.name}`,
          createdBy: session.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "ADJUST_STOCK",
          entityType: "ProductVariant",
          entityId: variantId,
          oldValues: { stock: oldStock },
          newValues: { stock: newStock, note },
        },
      });
    });

    return Response.json({ success: true, newStock });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyesuaikan stok";
    return Response.json({ error: message }, { status: 500 });
  }
}
