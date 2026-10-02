// src/components/admin/ReviewModerationClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReviewItem {
  id: number;
  rating: number;
  body: string | null;
  status: string;
  createdAt: Date;
  user: { name: string; phone: string };
  product: { name: string };
}

export default function ReviewModerationClient({ initialReviews }: { initialReviews: ReviewItem[] }) {
  const router = useRouter();
  const [reviews, setReviews] = useState(initialReviews);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleModerate = async (reviewId: number, status: "APPROVED" | "REJECTED") => {
    setLoadingId(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
        );
        router.refresh();
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b">
            <tr>
              <th className="p-4">Produk</th>
              <th className="p-4">Pembeli</th>
              <th className="p-4">Rating & Ulasan</th>
              <th className="p-4">Status Moderasi</th>
              <th className="p-4 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Belum ada ulasan yang perlu dimoderasi.
                </td>
              </tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{r.product.name}</td>
                  <td className="p-4">
                    <span className="font-semibold text-slate-800 block">{r.user.name}</span>
                    <span className="text-slate-400 text-[11px]">{r.user.phone}</span>
                  </td>
                  <td className="p-4 max-w-sm">
                    <div className="text-amber-400 font-bold mb-1">
                      {"★".repeat(r.rating)}
                      <span className="text-slate-200">{"★".repeat(5 - r.rating)}</span>
                    </div>
                    {r.body ? (
                      <p className="text-slate-600 leading-relaxed">{r.body}</p>
                    ) : (
                      <span className="text-slate-400 italic">Tanpa teks ulasan</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      r.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700"
                        : r.status === "REJECTED"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {r.status === "PENDING" && (
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={loadingId === r.id}
                          onClick={() => handleModerate(r.id, "APPROVED")}
                          className="py-1 px-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={loadingId === r.id}
                          onClick={() => handleModerate(r.id, "REJECTED")}
                          className="py-1 px-3 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-red-50 hover:text-red-700 transition"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
