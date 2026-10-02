// src/app/api/admin/shipping-zones/route.ts
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const zoneSchema = z.object({
  name: z.string().min(2),
  province: z.string().min(2),
  city: z.string().optional().nullable(),
  cost: z.number().int().nonnegative(),
  estimatedDays: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const zones = await db.shippingZone.findMany({ orderBy: { cost: "asc" } });
  return Response.json({ zones });
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = zoneSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Input tidak valid" }, { status: 400 });
    }

    const zone = await db.shippingZone.create({
      data: parsed.data,
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_SHIPPING_ZONE",
        entityType: "ShippingZone",
        entityId: zone.id,
        newValues: parsed.data,
      },
    });

    return Response.json({ success: true, zone });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat zona ongkir";
    return Response.json({ error: message }, { status: 500 });
  }
}
