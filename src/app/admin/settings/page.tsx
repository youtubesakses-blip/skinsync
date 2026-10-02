// src/app/admin/settings/page.tsx
// Khusus SUPER_ADMIN: Halaman pengaturan toko & template pesan WhatsApp

import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminSettingsClient from "@/components/admin/AdminSettingsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pengaturan Sistem & Template WA — SkinSync Super Admin",
};

export default async function AdminSettingsPage() {
  await requireSuperAdmin();

  const [settings, failedLogs] = await Promise.all([
    db.setting.findMany(),
    db.notificationLog.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const defaultTemplates: Record<string, string> = {
    otp_login: "*SkinSync*\nKode OTP Anda: *{{otp}}*\nBerlaku 5 menit. Jangan bagikan kode ini ke siapapun.",
    order_created: "*SkinSync* - Pesanan Dibuat ✅\nNo. Pesanan: *{{orderNumber}}*\nTotal: *{{total}}*\nBatas Bayar: {{expiresAt}}\n\nBayar di: {{paymentUrl}}",
    payment_received: "*SkinSync* - Pembayaran Diterima 💚\nNo. Pesanan: *{{orderNumber}}*\nTerima kasih! Pesanan Anda sedang kami proses.",
    order_shipped: "*SkinSync* - Pesanan Dikirim 🚚\nNo. Pesanan: *{{orderNumber}}*\nKurir: {{courier}}\nNo. Resi: *{{trackingNumber}}*",
    order_expired: "*SkinSync* - Pesanan Dibatalkan ⚠️\nNo. Pesanan: *{{orderNumber}}*\nPesanan Anda telah dibatalkan karena belum dibayar dalam batas waktu.",
  };

  const templates: Record<string, string> = { ...defaultTemplates };
  let expiryHours = 24;

  settings.forEach((s) => {
    if (s.key.startsWith("wa_template:")) {
      const templateKey = s.key.replace("wa_template:", "");
      if (typeof s.value === "string") {
        templates[templateKey] = s.value;
      }
    } else if (s.key === "order_expiry_hours") {
      if (typeof s.value === "number") {
        expiryHours = s.value;
      }
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pengaturan & Notifikasi WhatsApp</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Khusus Super Admin: Sesuaikan template pesan transaksional Fonnte dan konfigurasi sistem toko
        </p>
      </div>

      <AdminSettingsClient
        initialTemplates={templates}
        initialExpiryHours={expiryHours}
        failedLogs={failedLogs}
      />
    </div>
  );
}
