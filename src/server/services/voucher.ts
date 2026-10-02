// src/server/services/voucher.ts
// Service validasi dan kalkulasi diskon voucher

import { db } from "@/lib/db";
import type { Prisma, Voucher } from "../../../generated/prisma/client";

export interface VoucherValidationResult {
  valid: boolean;
  error?: string;
  voucher?: Voucher;
  discountAmount?: number;
}

/**
 * Validasi voucher dan hitung diskon.
 * @param code Kode voucher (case-insensitive)
 * @param userId ID user yang menggunakan
 * @param subtotal Subtotal belanja (sebelum diskon dan ongkir)
 * @param shippingCost Ongkir (untuk FREE_SHIPPING)
 */
export async function validateVoucher(
  code: string,
  userId: number,
  subtotal: number,
  shippingCost: number
): Promise<VoucherValidationResult> {
  const now = new Date();

  // Cari voucher (case-insensitive, simpan uppercase)
  const voucher = await db.voucher.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!voucher) {
    return { valid: false, error: "Kode voucher tidak ditemukan" };
  }

  if (!voucher.isActive) {
    return { valid: false, error: "Voucher tidak aktif" };
  }

  if (now < voucher.startsAt) {
    return { valid: false, error: "Voucher belum berlaku" };
  }

  if (now > voucher.endsAt) {
    return { valid: false, error: "Voucher sudah kadaluarsa" };
  }

  if (subtotal < voucher.minPurchase) {
    const formatted = voucher.minPurchase.toLocaleString("id-ID");
    return {
      valid: false,
      error: `Minimum pembelian Rp ${formatted} untuk menggunakan voucher ini`,
    };
  }

  // Cek kuota global
  if (voucher.quota !== null && voucher.usedCount >= voucher.quota) {
    return { valid: false, error: "Kuota voucher sudah habis" };
  }

  // Cek batas per user
  const userUsageCount = await db.voucherUsage.count({
    where: { voucherId: voucher.id, userId },
  });

  if (userUsageCount >= voucher.perUserLimit) {
    return {
      valid: false,
      error: `Anda sudah menggunakan voucher ini maksimal ${voucher.perUserLimit}x`,
    };
  }

  // Hitung diskon
  let discountAmount = 0;

  if (voucher.type === "PERCENT") {
    const rawDiscount = Math.floor((subtotal * voucher.value) / 100);
    discountAmount = voucher.maxDiscount
      ? Math.min(rawDiscount, voucher.maxDiscount)
      : rawDiscount;
  } else if (voucher.type === "FIXED") {
    discountAmount = Math.min(voucher.value, subtotal);
  } else if (voucher.type === "FREE_SHIPPING") {
    discountAmount = shippingCost;
  }

  return { valid: true, voucher, discountAmount };
}

/**
 * Rollback voucher saat order EXPIRED atau CANCELLED.
 * Hapus VoucherUsage dan kurangi usedCount.
 * @param tx Client transaksi aktif (wajib diisi bila dipanggil dari dalam `$transaction`
 * agar rollback ikut atomic dengan operasi lain, sesuai plan 6.5/6.7).
 */
export async function rollbackVoucher(
  orderId: number,
  voucherId: number,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? db;

  // Hapus usage record
  await client.voucherUsage.deleteMany({ where: { orderId } });

  // Kurangi usedCount
  await client.voucher.update({
    where: { id: voucherId },
    data: { usedCount: { decrement: 1 } },
  });
}
