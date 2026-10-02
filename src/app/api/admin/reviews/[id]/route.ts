// src/app/api/admin/reviews/[id]/route.ts
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ReviewStatus } from "../../../../../../generated/prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const reviewId = parseInt(id, 10);

  try {
    const body = await request.json();
    const { status } = body;

    if (status !== "APPROVED" && status !== "REJECTED") {
      return Response.json({ error: "Status harus APPROVED atau REJECTED" }, { status: 400 });
    }

    const review = await db.review.findUnique({
      where: { id: reviewId },
      include: { product: true },
    });

    if (!review) {
      return Response.json({ error: "Ulasan tidak ditemukan" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      // 1. Update status ulasan
      await tx.review.update({
        where: { id: reviewId },
        data: { status: status as ReviewStatus },
      });

      // 2. Hitung ulang avgRating dan reviewCount untuk produk ini
      const stats = await tx.review.aggregate({
        where: {
          productId: review.productId,
          status: "APPROVED",
        },
        _avg: { rating: true },
        _count: { id: true },
      });

      await tx.product.update({
        where: { id: review.productId },
        data: {
          avgRating: stats._avg.rating || 0,
          reviewCount: stats._count.id || 0,
        },
      });

      // 3. Catat AuditLog
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: `MODERATE_REVIEW_${status}`,
          entityType: "Review",
          entityId: reviewId,
          newValues: { status, productId: review.productId },
        },
      });
    });

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memoderasi ulasan";
    return Response.json({ error: message }, { status: 500 });
  }
}
