// src/app/api/orders/create/route.ts
import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkoutSchema } from "@/lib/validators/order";
import { createOrder } from "@/server/services/order";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || "Data checkout tidak valid" },
        { status: 400 }
      );
    }

    const { addressId, shippingZoneId, voucherCode, customerNote } = parsed.data;

    // Ambil alamat pengiriman
    const address = await db.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== session.userId) {
      return Response.json({ error: "Alamat pengiriman tidak ditemukan" }, { status: 400 });
    }

    // Ambil zona pengiriman
    const shippingZone = await db.shippingZone.findUnique({
      where: { id: shippingZoneId, isActive: true },
    });

    if (!shippingZone) {
      return Response.json({ error: "Zona pengiriman tidak valid" }, { status: 400 });
    }

    // Jalankan createOrder transaksional
    const result = await createOrder({
      userId: session.userId,
      address,
      shippingZone,
      voucherCode,
      customerNote,
    });

    return Response.json({
      success: true,
      orderNumber: result.order.orderNumber,
      snapToken: result.snapToken,
      redirectUrl: result.redirectUrl,
      midtransError: result.midtransError ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat pesanan";
    return Response.json({ error: message }, { status: 400 });
  }
}
