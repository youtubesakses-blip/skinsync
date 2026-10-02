// src/app/api/admin/vouchers/route.ts
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const voucherCreateSchema = z.object({
  code: z.string().min(3).max(50),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.number().int().min(0),
  maxDiscount: z.number().int().positive().optional().nullable(),
  minPurchase: z.number().int().min(0).default(0),
  quota: z.number().int().positive().optional().nullable(),
  perUserLimit: z.number().int().min(1).default(1),
  startsAt: z.string(),
  endsAt: z.string(),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = voucherCreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Input tidak valid" }, { status: 400 });
    }

    const { startsAt, endsAt, code, ...rest } = parsed.data;

    const voucher = await db.voucher.create({
      data: {
        ...rest,
        code: code.toUpperCase().trim(),
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_VOUCHER",
        entityType: "Voucher",
        entityId: voucher.id,
        newValues: { code: voucher.code, type: voucher.type },
      },
    });

    return Response.json({ success: true, voucher });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat voucher";
    return Response.json({ error: message }, { status: 500 });
  }
}
