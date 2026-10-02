// src/lib/validators/auth.ts
// Zod validator untuk auth (OTP request, OTP verify)

import { z } from "zod";

export const requestOtpSchema = z.object({
  phone: z
    .string()
    .min(9, "Nomor HP terlalu pendek")
    .max(15, "Nomor HP terlalu panjang")
    .regex(/^[\d\+\-\s]+$/, "Format nomor HP tidak valid"),
});

export const verifyOtpSchema = z.object({
  phone: z.string(),
  otp: z
    .string()
    .length(6, "OTP harus 6 digit")
    .regex(/^\d+$/, "OTP hanya boleh angka"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100),
  skinTypeId: z.number().int().positive().optional().nullable(),
  allergies: z.string().max(500).optional().nullable(),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
