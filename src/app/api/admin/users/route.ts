// src/app/api/admin/users/route.ts
// Khusus SUPER_ADMIN: tambah admin baru

import { type NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizePhone, isValidPhone } from "@/lib/phone";
import { z } from "zod";

const createAdminSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(9),
});

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireSuperAdmin();
  } catch {
    return Response.json({ error: "Forbidden: Khusus Super Admin" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createAdminSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Input tidak valid" }, { status: 400 });
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!isValidPhone(phone)) {
      return Response.json({ error: "Format nomor HP tidak valid" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { phone } });
    if (existing) {
      return Response.json({ error: "Nomor HP sudah terdaftar sebagai pengguna/admin" }, { status: 400 });
    }

    const newAdmin = await db.user.create({
      data: {
        name: parsed.data.name,
        phone,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_ADMIN_USER",
        entityType: "User",
        entityId: newAdmin.id,
        newValues: { name: newAdmin.name, phone: newAdmin.phone, role: newAdmin.role },
      },
    });

    return Response.json({ success: true, user: newAdmin });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan admin";
    return Response.json({ error: message }, { status: 500 });
  }
}
