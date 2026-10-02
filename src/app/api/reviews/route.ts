// src/app/api/reviews/route.ts
import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createReviewSchema = z.object({
  orderItemId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Input ulasan tidak valid" }, { status: 400 });
    }

    const { orderItemId, rating, body: reviewBody } = parsed.data;

    // Cek order item dan pastikan status order COMPLETED dan user adalah pemiliknya
    const orderItem = await db.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
        variant: true,
        review: true,
      },
    });

    if (!orderItem || orderItem.order.userId !== session.userId) {
      return Response.json({ error: "Item pesanan tidak ditemukan" }, { status: 404 });
    }

    if (orderItem.order.status !== "COMPLETED") {
      return Response.json({ error: "Ulasan hanya dapat diberikan setelah pesanan berstatus Selesai (COMPLETED)" }, { status: 400 });
    }

    if (orderItem.review) {
      return Response.json({ error: "Anda sudah memberikan ulasan untuk produk ini" }, { status: 400 });
    }

    const review = await db.review.create({
      data: {
        productId: orderItem.variant.productId,
        userId: session.userId,
        orderItemId: orderItem.id,
        rating,
        body: reviewBody?.trim() || null,
        status: "PENDING", // Menunggu moderasi admin
      },
    });

    return Response.json({ success: true, review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengirimkan ulasan";
    return Response.json({ error: message }, { status: 500 });
  }
}
