// src/app/api/admin/banners/[id]/route.ts
// Edit & hapus banner beranda
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject } from "@/lib/storage";
import { z } from "zod";

const bannerUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  imageKey: z.string().min(5).optional(),
  linkUrl: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
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
  const bannerId = parseId(id);
  if (bannerId === null) {
    return Response.json({ error: "ID banner tidak valid" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = bannerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || "Input tidak valid" },
        { status: 400 }
      );
    }

    const banner = await db.banner.update({
      where: { id: bannerId },
      data: parsed.data,
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPDATE_BANNER",
        entityType: "Banner",
        entityId: banner.id,
        newValues: parsed.data,
      },
    });

    return Response.json({ success: true, banner });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengupdate banner";
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
  const bannerId = parseId(id);
  if (bannerId === null) {
    return Response.json({ error: "ID banner tidak valid" }, { status: 400 });
  }

  try {
    const banner = await db.banner.findUnique({ where: { id: bannerId } });
    if (!banner) {
      return Response.json({ error: "Banner tidak ditemukan" }, { status: 404 });
    }

    await db.banner.delete({ where: { id: bannerId } });

    // Best effort hapus file di bucket
    deleteObject(banner.imageKey).catch(() => {});

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "DELETE_BANNER",
        entityType: "Banner",
        entityId: bannerId,
        oldValues: { title: banner.title },
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus banner";
    return Response.json({ error: message }, { status: 500 });
  }
}
