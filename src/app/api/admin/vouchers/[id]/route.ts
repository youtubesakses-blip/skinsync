// src/app/api/admin/vouchers/[id]/route.ts
// Edit & hapus voucher (kode & tipe tidak bisa diubah setelah dibuat)
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const voucherUpdateSchema = z.object({
  value: z.number().int().min(0).optional(),
  maxDiscount: z.number().int().positive().optional().nullable(),
  minPurchase: z.number().int().min(0).optional(),
  quota: z.number().int().positive().optional().nullable(),
  perUserLimit: z.number().int().min(1).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
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
  const voucherId = parseId(id);
  if (voucherId === null) {
    return Response.json({ error: "ID voucher tidak valid" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = voucherUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || "Input tidak valid" },
        { status: 400 }
      );
    }

    const { startsAt, endsAt, ...rest } = parsed.data;
    const voucher = await db.voucher.update({
      where: { id: voucherId },
      data: {
        ...rest,
        ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
        ...(endsAt ? { endsAt: new Date(endsAt) } : {}),
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPDATE_VOUCHER",
        entityType: "Voucher",
        entityId: voucher.id,
        newValues: parsed.data,
      },
    });

    return Response.json({ success: true, voucher });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengupdate voucher";
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
  const voucherId = parseId(id);
  if (voucherId === null) {
    return Response.json({ error: "ID voucher tidak valid" }, { status: 400 });
  }

  try {
    const voucher = await db.voucher.findUnique({
      where: { id: voucherId },
      include: { _count: { select: { orders: true, usages: true } } },
    });
    if (!voucher) {
      return Response.json({ error: "Voucher tidak ditemukan" }, { status: 404 });
    }

    // Tolak hapus bila voucher sudah pernah dipakai — nonaktifkan saja
    if (voucher.usedCount > 0 || voucher._count.orders > 0 || voucher._count.usages > 0) {
      return Response.json(
        { error: "Voucher sudah pernah dipakai dan tidak bisa dihapus. Nonaktifkan saja." },
        { status: 400 }
      );
    }

    await db.voucher.delete({ where: { id: voucherId } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "DELETE_VOUCHER",
        entityType: "Voucher",
        entityId: voucherId,
        oldValues: { code: voucher.code },
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus voucher";
    return Response.json({ error: message }, { status: 500 });
  }
}
