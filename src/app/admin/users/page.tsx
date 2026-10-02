// src/app/admin/users/page.tsx
// Khusus SUPER_ADMIN: Halaman kelola akun admin

import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminUsersManagerClient from "@/components/admin/AdminUsersManagerClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Akun Admin — SkinSync Super Admin",
};

export default async function AdminUsersPage() {
  const session = await requireSuperAdmin();

  const admins = await db.user.findMany({
    where: {
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kelola Akun Admin</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Khusus Super Admin: Daftarkan nomor WhatsApp admin baru, kelola hak akses, atau blokir akun
        </p>
      </div>

      <AdminUsersManagerClient
        initialAdmins={admins}
        currentUserId={session.userId}
      />
    </div>
  );
}
