// src/lib/storage.ts
// Wrapper Supabase Storage client
// Gambar diakses via public URL Supabase Storage

import { createClient } from "@supabase/supabase-js";

// Prefix key yang diizinkan (whitelist untuk mencegah path traversal)
export const ALLOWED_KEY_PREFIXES = ["products/", "brands/"] as const;
export type AllowedPrefix = (typeof ALLOWED_KEY_PREFIXES)[number];

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Variabel SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi"
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

function getBucket(): string {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!bucket) throw new Error("SUPABASE_STORAGE_BUCKET wajib diisi");
  return bucket;
}

/**
 * Upload file ke Supabase Storage.
 * @param key  Key tujuan, contoh: products/uuid.webp
 * @param body Buffer file
 * @param contentType MIME type, mis: image/webp
 */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const bucket = getBucket();

  const { error } = await supabase.storage.from(bucket).upload(key, body, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Gagal upload ke Supabase Storage: ${error.message}`);
  }
}

/**
 * Hapus objek dari Supabase Storage (best effort).
 */
export async function deleteObject(key: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const bucket = getBucket();

    const { error } = await supabase.storage.from(bucket).remove([key]);
    if (error) {
      console.error("[storage] Gagal hapus objek:", key, error);
    }
  } catch (err) {
    console.error("[storage] Gagal hapus objek:", key, err);
  }
}

/**
 * Validasi key agar hanya prefix yang diizinkan dan tidak ada path traversal.
 */
export function isValidKey(key: string): boolean {
  // Cegah path traversal
  if (key.includes("..") || key.includes("//")) return false;
  // Hanya karakter aman
  if (!/^[a-zA-Z0-9/_\-\.]+$/.test(key)) return false;
  // Harus dimulai dengan prefix whitelist
  return ALLOWED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/**
 * Generate public URL untuk gambar di Supabase Storage.
 * Supabase Storage public URLs tidak memerlukan proxy.
 */
export function getPublicUrl(key: string): string {
  const supabase = getSupabaseClient();
  const bucket = getBucket();

  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}