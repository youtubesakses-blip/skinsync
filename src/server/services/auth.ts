// src/server/services/auth.ts
// Service auth: OTP request, verify, rate limiting

import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { sendWhatsApp } from "./notification";
import crypto from "crypto";

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_MAX_PER_HOUR = 5;

/**
 * Generate OTP 6 digit acak.
 */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash OTP dengan SHA-256.
 */
function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export interface RequestOtpResult {
  success: boolean;
  error?: string;
  cooldownSeconds?: number;
}

/**
 * Request OTP baru untuk nomor HP.
 * Melakukan rate limit: cooldown 60 detik, max 5 OTP/jam.
 */
export async function requestOtp(rawPhone: string): Promise<RequestOtpResult> {
  const phone = normalizePhone(rawPhone);
  const now = new Date();

  // Cek cooldown: apakah ada OTP yang dibuat dalam 60 detik terakhir
  const lastOtp = await db.otpCode.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });

  if (lastOtp) {
    const secondsElapsed = (now.getTime() - lastOtp.createdAt.getTime()) / 1000;
    if (secondsElapsed < OTP_COOLDOWN_SECONDS) {
      const remaining = Math.ceil(OTP_COOLDOWN_SECONDS - secondsElapsed);
      return {
        success: false,
        error: `Tunggu ${remaining} detik sebelum minta OTP baru`,
        cooldownSeconds: remaining,
      };
    }
  }

  // Cek rate limit: max 5 OTP per jam
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recentCount = await db.otpCode.count({
    where: { phone, createdAt: { gte: oneHourAgo } },
  });

  if (recentCount >= OTP_MAX_PER_HOUR) {
    return {
      success: false,
      error: "Terlalu banyak permintaan OTP. Coba lagi dalam 1 jam.",
    };
  }

  // Generate dan simpan OTP baru
  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await db.otpCode.create({
    data: { phone, codeHash, expiresAt },
  });

  // Kirim OTP via WhatsApp (async, kegagalan tidak memblokir)
  await sendWhatsApp(phone, "otp_login", {
    otp,
  });

  return { success: true };
}

export interface VerifyOtpResult {
  success: boolean;
  error?: string;
  isNewUser?: boolean;
  userId?: number;
}

/**
 * Verifikasi OTP dan buat/update session user.
 */
export async function verifyOtp(
  rawPhone: string,
  otp: string
): Promise<VerifyOtpResult> {
  const phone = normalizePhone(rawPhone);
  const codeHash = hashOtp(otp);
  const now = new Date();

  // Cari OTP valid (belum expired dan belum dipakai)
  const otpRecord = await db.otpCode.findFirst({
    where: {
      phone,
      expiresAt: { gt: now },
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    return { success: false, error: "OTP tidak valid atau sudah kadaluarsa" };
  }

  // Cek max attempts
  if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
    return {
      success: false,
      error: "OTP terkunci. Mohon minta OTP baru.",
    };
  }

  // Verifikasi hash
  if (otpRecord.codeHash !== codeHash) {
    // Tambah attempt
    await db.otpCode.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = OTP_MAX_ATTEMPTS - (otpRecord.attempts + 1);
    return {
      success: false,
      error: `OTP salah. Sisa ${remaining} percobaan.`,
    };
  }

  // OTP valid — tandai sebagai sudah dipakai
  await db.otpCode.update({
    where: { id: otpRecord.id },
    data: { usedAt: now },
  });

  // Cek apakah user sudah ada
  let user = await db.user.findUnique({ where: { phone } });
  let isNewUser = false;

  if (!user) {
    // User baru — buat dengan nama default (akan diminta isi nama)
    user = await db.user.create({
      data: {
        phone,
        name: "Pengguna Baru",
        role: "CUSTOMER",
        status: "ACTIVE",
      },
    });
    isNewUser = true;
  }

  // Cek apakah user aktif
  if (user.status === "BLOCKED") {
    return { success: false, error: "Akun Anda diblokir. Hubungi admin." };
  }

  return { success: true, isNewUser, userId: user.id };
}
