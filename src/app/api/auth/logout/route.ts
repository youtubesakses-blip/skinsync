// src/app/api/auth/logout/route.ts
// Endpoint logout — hapus session cookie

import { clearSession } from "@/lib/auth";

export async function POST() {
  await clearSession();
  return Response.json({ success: true });
}
