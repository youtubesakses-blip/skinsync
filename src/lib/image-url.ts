// src/lib/image-url.ts
// Helper URL gambar Supabase Storage — AMAN untuk client & server.
// Menggunakan public URL Supabase Storage langsung.

/**
 * Helper URL gambar Supabase Storage.
 * Karena gambar sudah dioptimasi saat upload, bisa pakai next/image dengan unoptimized.
 */
export function imageUrl(key: string | null | undefined): string {
  if (!key) return "/images/placeholder.webp";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;

  if (!supabaseUrl || !bucket) {
    // Fallback ke proxy route untuk backward compatibility
    return `/api/images/${key}`;
  }

  // Supabase public URL format: https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/<key>
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;
}
