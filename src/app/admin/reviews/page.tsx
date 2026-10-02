// src/app/admin/reviews/page.tsx
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import ReviewModerationClient from "@/components/admin/ReviewModerationClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moderasi Ulasan Pembeli — SkinSync Admin",
};

export default async function AdminReviewsPage() {
  await requireAdmin();

  const reviews = await db.review.findMany({
    include: {
      user: { select: { name: true, phone: true } },
      product: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Moderasi Ulasan Pembeli</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Hanya ulasan dengan status APPROVED yang akan tampil di katalog publik dan mempengaruhi rating produk
        </p>
      </div>

      <ReviewModerationClient initialReviews={reviews} />
    </div>
  );
}
