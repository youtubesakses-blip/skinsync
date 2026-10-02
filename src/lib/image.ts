// src/lib/image.ts
// SERVER-ONLY: pemrosesan gambar dengan sharp (validasi, resize, konversi ke WebP).
// Jangan import file ini dari Client Component — gunakan @/lib/image-url untuk imageUrl().
// Helper imageUrl() di-re-export dari ./image-url agar import lama tetap jalan di server.

import sharp from "sharp";

export { imageUrl } from "./image-url";

// Ukuran maksimal per kategori gambar (lebar dalam piksel)
const MAX_WIDTHS = {
  product: 1200,
  banner: 1600,
  brand: 400,
} as const;

export type ImageType = keyof typeof MAX_WIDTHS;

/**
 * Proses gambar: auto-rotate, hapus EXIF, resize, konversi ke WebP.
 * Melempar error jika bukan gambar valid (JPG/PNG/WebP).
 * @returns Buffer WebP hasil proses
 */
export async function processImage(
  buffer: Buffer,
  type: ImageType = "product"
): Promise<Buffer> {
  // Validasi tipe file dengan memeriksa isi buffer (bukan ekstensi)
  const meta = await sharp(buffer).metadata();

  if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) {
    throw new Error(
      `Tipe file tidak didukung: ${meta.format ?? "tidak diketahui"}. Hanya JPG, PNG, WebP.`
    );
  }

  const maxWidth = MAX_WIDTHS[type];

  const result = await sharp(buffer)
    .rotate() // auto-rotate berdasarkan EXIF orientation
    .withMetadata({ exif: {} }) // hapus semua metadata EXIF
    .resize({
      width: maxWidth,
      withoutEnlargement: true, // jangan perbesar jika sudah lebih kecil
    })
    .webp({ quality: 80 })
    .toBuffer();

  return result;
}

/**
 * @deprecated Import dari @/lib/image-url agar aman dipakai di Client Component.
 * Re-export ini hanya untuk kompatibilitas server.
 */
