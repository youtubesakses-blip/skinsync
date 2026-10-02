// src/server/services/notification.ts
// Service notifikasi WhatsApp via Fonnte
// Semua pengiriman lewat satu fungsi sendWhatsApp()

import { db } from "@/lib/db";
import { sendFonnteMessage } from "@/lib/fonnte";
import type { Prisma } from "../../../generated/prisma/client";

// Template WA default (bisa di-override dari tabel Setting)
const DEFAULT_TEMPLATES: Record<string, string> = {
  otp_login: `*SkinSync*\nKode OTP Anda: *{{otp}}*\nBerlaku 5 menit. Jangan bagikan kode ini ke siapapun.`,
  order_created: `*SkinSync* - Pesanan Dibuat ✅\nNo. Pesanan: *{{orderNumber}}*\nTotal: *{{total}}*\nBatas Bayar: {{expiresAt}}\n\nBayar di: {{paymentUrl}}`,
  payment_received: `*SkinSync* - Pembayaran Diterima 💚\nNo. Pesanan: *{{orderNumber}}*\nTerima kasih! Pesanan Anda sedang kami proses.`,
  order_shipped: `*SkinSync* - Pesanan Dikirim 🚚\nNo. Pesanan: *{{orderNumber}}*\nKurir: {{courier}}\nNo. Resi: *{{trackingNumber}}*`,
  order_expired: `*SkinSync* - Pesanan Dibatalkan ⚠️\nNo. Pesanan: *{{orderNumber}}*\nPesanan Anda telah dibatalkan karena belum dibayar dalam batas waktu.`,
};

/**
 * Render template WA dengan mengganti variabel {{key}} dengan nilai aktual.
 */
function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

/**
 * Ambil template dari database (Setting) atau gunakan default.
 */
async function getTemplate(templateKey: string): Promise<string> {
  const setting = await db.setting.findUnique({
    where: { key: `wa_template:${templateKey}` },
  });

  if (setting && typeof setting.value === "string") {
    return setting.value;
  }

  return DEFAULT_TEMPLATES[templateKey] ?? "";
}

/**
 * Kirim notifikasi WhatsApp.
 * Kegagalan tidak melempar error (tidak menggagalkan proses utama).
 * @param recipient Nomor WA tujuan (format 62xxxxxxxxxx)
 * @param templateKey Key template, mis: "otp_login"
 * @param vars Variabel pengganti di template
 * @param orderId ID pesanan (opsional)
 */
export async function sendWhatsApp(
  recipient: string,
  templateKey: string,
  vars: Record<string, string>,
  orderId?: number
): Promise<void> {
  let logId: number | undefined;

  try {
    // Render pesan
    const template = await getTemplate(templateKey);
    const message = renderTemplate(template, vars);

    // Simpan log dengan status QUEUED
    const log = await db.notificationLog.create({
      data: {
        orderId,
        recipient,
        templateKey,
        message,
        status: "QUEUED",
      },
    });
    logId = log.id;

    // Kirim via Fonnte
    const result = await sendFonnteMessage(recipient, message);

    // Update status ke SENT
    await db.notificationLog.update({
      where: { id: logId },
      data: {
        status: "SENT",
        providerResponse: result as unknown as Prisma.InputJsonValue,
        sentAt: new Date(),
        attempts: { increment: 1 },
      },
    });
  } catch (error) {
    // Update status ke FAILED (tidak melempar error ke caller)
    console.error(`[notification] Gagal kirim WA ke ${recipient}:`, error);

    if (logId) {
      await db.notificationLog
        .update({
          where: { id: logId },
          data: {
            status: "FAILED",
            attempts: { increment: 1 },
            providerResponse: {
              error: error instanceof Error ? error.message : "Unknown error",
            },
          },
        })
        .catch((updateErr) => {
          console.error("[notification] Gagal update log:", updateErr);
        });
    }
  }
}

/**
 * Retry notifikasi FAILED dengan attempts < 3.
 * Dipanggil dari cron job.
 */
export async function retryFailedNotifications(): Promise<void> {
  const failed = await db.notificationLog.findMany({
    where: { status: "FAILED", attempts: { lt: 3 } },
    take: 20, // proses maksimal 20 per run
  });

  for (const log of failed) {
    try {
      // Jeda antar pengiriman
      await new Promise((r) => setTimeout(r, 1500));

      const result = await sendFonnteMessage(log.recipient, log.message);

      await db.notificationLog.update({
        where: { id: log.id },
        data: {
          status: "SENT",
          providerResponse: result as unknown as Prisma.InputJsonValue,
          sentAt: new Date(),
          attempts: { increment: 1 },
        },
      });
    } catch (error) {
      await db.notificationLog
        .update({
          where: { id: log.id },
          data: {
            status: "FAILED",
            attempts: { increment: 1 },
            providerResponse: {
              error: error instanceof Error ? error.message : "Unknown error",
            },
          },
        })
        .catch(() => {});
    }
  }
}
