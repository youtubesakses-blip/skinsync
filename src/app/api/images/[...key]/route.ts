// src/app/api/images/[...key]/route.ts
// Redirect ke public URL Supabase Storage untuk backward compatibility
// Gambar baru sudah menggunakan public URL langsung via imageUrl()

import { type NextRequest } from "next/server";
import { isValidKey } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: keyParts } = await params;
  const key = keyParts.join("/");

  // Validasi key — cegah path traversal dan prefix tidak diizinkan
  if (!isValidKey(key)) {
    return new Response("Not Found", { status: 404 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;

  if (!supabaseUrl || !bucket) {
    return new Response("Storage not configured", { status: 500 });
  }

  // Redirect ke public URL Supabase
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;

  return Response.redirect(publicUrl, 307);
}
