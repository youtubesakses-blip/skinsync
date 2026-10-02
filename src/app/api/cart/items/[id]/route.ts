// src/app/api/cart/items/[id]/route.ts
import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { updateCartItemQuantity, removeCartItem } from "@/server/services/cart";
import { z } from "zod";

const updateSchema = z.object({
  qty: z.number().int().min(0),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const itemId = parseInt(id, 10);

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid qty" }, { status: 400 });
    }

    const item = await updateCartItemQuantity(session.userId, itemId, parsed.data.qty);
    return Response.json({ success: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah jumlah";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const itemId = parseInt(id, 10);

  try {
    await removeCartItem(session.userId, itemId);
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus item";
    return Response.json({ error: message }, { status: 400 });
  }
}
