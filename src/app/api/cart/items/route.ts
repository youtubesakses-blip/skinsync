// src/app/api/cart/items/route.ts
import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getOrCreateCart, addItemToCart } from "@/server/services/cart";
import { z } from "zod";

const addItemSchema = z.object({
  variantId: z.number().int().positive(),
  qty: z.number().int().positive().default(1),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cart = await getOrCreateCart(session.userId);
  return Response.json({ cart });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = addItemSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const item = await addItemToCart(session.userId, parsed.data.variantId, parsed.data.qty);
    return Response.json({ success: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan ke keranjang";
    return Response.json({ error: message }, { status: 400 });
  }
}
