// src/app/api/admin/upload/route.ts
// Upload gambar — hanya ADMIN/SUPER_ADMIN
// Validasi tipe file, ukuran, proses dengan sharp, simpan ke bucket

import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { processImage, type ImageType } from "@/lib/image";
import { putObject, getPublicUrl } from "@/lib/storage";
import crypto from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  // Auth: hanya ADMIN/SUPER_ADMIN
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const imageType = (formData.get("type") as ImageType) ?? "product";

  if (!file) {
    return Response.json({ error: "File tidak ditemukan" }, { status: 400 });
  }

  // Cek ukuran file
  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "Ukuran file maksimal 5 MB" },
      { status: 400 }
    );
  }

  // Tentukan prefix berdasarkan imageType
  const prefixMap: Record<string, string> = {
    product: "products",
    brand: "brands",
  };
  const prefix = prefixMap[imageType] ?? "products";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Proses gambar dengan sharp (validasi tipe + resize + WebP)
    const processedBuffer = await processImage(buffer, imageType);

    // Generate key unik dengan UUID
    const uuid = crypto.randomUUID();
    const key = `${prefix}/${uuid}.webp`;

    // Upload ke Supabase Storage
    await putObject(key, processedBuffer, "image/webp");

    // Generate public URL Supabase
    const publicUrl = getPublicUrl(key);

    return Response.json({ key, url: publicUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memproses gambar";
    return Response.json({ error: message }, { status: 400 });
  }
}
