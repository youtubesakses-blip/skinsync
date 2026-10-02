// src/app/api/admin/shipping-zones/[id]/route.ts
// Edit & hapus zona ongkir flat
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const zoneUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  province: z.string().min(2).optional(),
  city: z.string().optional().nullable(),
  cost: z.number().int().nonnegative().optional(),
  estimatedDays: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

function parseId(id: string) {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

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
  const zoneId = parseId(id);
  if (zoneId === null) {
    return Response.json({ error: "ID zona tidak valid" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = zoneUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || "Input tidak valid" },
        { status: 400 }
      );
    }

    const zone = await db.shippingZone.update({
      where: { id: zoneId },
      data: parsed.data,
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPDATE_SHIPPING_ZONE",
        entityType: "ShippingZone",
        entityId: zone.id,
        newValues: parsed.data,
      },
    });

    return Response.json({ success: true, zone });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengupdate zona ongkir";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const zoneId = parseId(id);
  if (zoneId === null) {
    return Response.json({ error: "ID zona tidak valid" }, { status: 400 });
  }

  try {
    const orderCount = await db.order.count({ where: { shippingZoneId: zoneId } });
    if (orderCount > 0) {
      return Response.json(
        { error: `Zona sudah dipakai ${orderCount} pesanan dan tidak bisa dihapus. Nonaktifkan saja.` },
        { status: 400 }
      );
    }

    const zone = await db.shippingZone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      return Response.json({ error: "Zona tidak ditemukan" }, { status: 404 });
    }

    await db.shippingZone.delete({ where: { id: zoneId } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "DELETE_SHIPPING_ZONE",
        entityType: "ShippingZone",
        entityId: zoneId,
        oldValues: { name: zone.name },
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus zona ongkir";
    return Response.json({ error: message }, { status: 500 });
  }
}
