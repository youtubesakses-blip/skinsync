// src/app/api/admin/banners/route.ts
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const bannerSchema = z.object({
  title: z.string().min(2),
  imageKey: z.string().min(5),
  linkUrl: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
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
    const parsed = bannerSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Input tidak valid" }, { status: 400 });
    }

    const banner = await db.banner.create({
      data: parsed.data,
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_BANNER",
        entityType: "Banner",
        entityId: banner.id,
        newValues: parsed.data,
      },
    });

    return Response.json({ success: true, banner });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat banner";
    return Response.json({ error: message }, { status: 500 });
  }
}
