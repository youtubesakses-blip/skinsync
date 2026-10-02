// src/app/api/admin/settings/route.ts
// Khusus SUPER_ADMIN: Simpan pengaturan toko dan template pesan WhatsApp

import { type NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireSuperAdmin();
  } catch {
    return Response.json({ error: "Forbidden: Khusus Super Admin" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { settings } = body; // Array of { key: string, value: any }

    if (!Array.isArray(settings)) {
      return Response.json({ error: "Format settings harus array" }, { status: 400 });
    }

    for (const item of settings) {
      await db.setting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
      });
    }

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPDATE_SYSTEM_SETTINGS",
        entityType: "Setting",
        newValues: { updatedKeys: settings.map((s) => s.key) },
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan pengaturan";
    return Response.json({ error: message }, { status: 500 });
  }
}
