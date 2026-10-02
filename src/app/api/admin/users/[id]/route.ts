// src/app/api/admin/users/[id]/route.ts
// Khusus SUPER_ADMIN: blokir/buka blokir atau hapus admin

import { type NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSuperAdmin();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const targetUserId = parseInt(id, 10);

  if (targetUserId === session.userId) {
    return Response.json({ error: "Tidak dapat mengubah status akun sendiri" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (status !== "ACTIVE" && status !== "BLOCKED") {
      return Response.json({ error: "Status harus ACTIVE atau BLOCKED" }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: targetUserId },
      data: { status },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: `CHANGE_USER_STATUS_${status}`,
        entityType: "User",
        entityId: targetUserId,
        newValues: { status },
      },
    });

    return Response.json({ success: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengupdate akun";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSuperAdmin();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const targetUserId = parseInt(id, 10);

  if (targetUserId === session.userId) {
    return Response.json({ error: "Tidak dapat menghapus akun sendiri" }, { status: 400 });
  }

  try {
    const user = await db.user.findUnique({ where: { id: targetUserId } });
    if (!user) return Response.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    if (user.role === "SUPER_ADMIN") {
      return Response.json({ error: "Tidak dapat menghapus sesama SUPER_ADMIN" }, { status: 400 });
    }

    await db.user.delete({ where: { id: targetUserId } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "DELETE_ADMIN_USER",
        entityType: "User",
        entityId: targetUserId,
        oldValues: { name: user.name, phone: user.phone },
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus akun";
    return Response.json({ error: message }, { status: 500 });
  }
}
