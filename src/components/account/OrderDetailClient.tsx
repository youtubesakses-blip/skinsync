// src/components/account/OrderDetailClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface OrderDetailClientProps {
  orderStatus: string;
  snapToken?: string | null;
  redirectUrl?: string | null;
  items: Array<{
    id: number;
    productName: string;
    variantName: string;
    hasReview: boolean;
  }>;
}

export default function OrderDetailClient({
  orderStatus,
  snapToken,
  redirectUrl,
  items,
}: OrderDetailClientProps) {
  const router = useRouter();
  const [reviewingItemId, setReviewingItemId] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [body, setBody] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const handlePayNow = () => {
    if (snapToken && window.snap) {
      window.snap.pay(snapToken, {
        onSuccess: () => router.refresh(),
        onPending: () => router.refresh(),
        onError: () => router.refresh(),
        onClose: () => router.refresh(),
      });
    } else if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  const handleSendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingItemId) return;
    setLoading(true);
    setReviewError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: reviewingItemId,
          rating,
          body,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || "Gagal mengirimkan ulasan");
      } else {
        setReviewSuccess("Terima kasih! Ulasan Anda telah dikirim dan menunggu moderasi admin.");
        setReviewingItemId(null);
        router.refresh();
      }
    } catch {
      setReviewError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Pay Now Button if PENDING_PAYMENT */}
      {orderStatus === "PENDING_PAYMENT" && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-amber-900">Menunggu Pembayaran</p>
            <p className="text-[11px] text-amber-700">Segera selesaikan pembayaran sebelum pesanan kedaluwarsa.</p>
          </div>
          <button
            type="button"
            onClick={handlePayNow}
            className="py-2.5 px-6 rounded-xl bg-amber-600 text-white font-extrabold text-xs hover:bg-amber-700 transition shadow-sm w-full sm:w-auto"
          >
            Bayar Sekarang →
          </button>
        </div>
      )}

      {/* Reviews Form for Completed Order Items */}
      {orderStatus === "COMPLETED" && (
        <div className="pt-2">
          {reviewSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-green-50 text-green-800 text-xs font-semibold border border-green-200">
              {reviewSuccess}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Beri Ulasan Produk:</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-gray-800">{item.productName} ({item.variantName})</span>
                  {item.hasReview ? (
                    <span className="text-emerald-600 font-bold text-[11px]">✓ Ulasan Terkirim</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReviewingItemId(item.id);
                        setReviewError(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-700 transition"
                    >
                      Tulis Ulasan
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Modal / Inline Review Form */}
          {reviewingItemId && (
            <form onSubmit={handleSendReview} className="mt-4 p-4 bg-white rounded-xl border-2 border-indigo-200 space-y-3">
              <h4 className="text-xs font-bold text-gray-900">
                Tulis Ulasan Anda
              </h4>
              {reviewError && <p className="text-xs text-red-600">{reviewError}</p>}
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Rating Bintang (1 - 5):</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-lg transition ${star <= rating ? "text-amber-400" : "text-gray-300"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Kesan Penggunaan (Opsional):</label>
                <textarea
                  rows={2}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Ceritakan pengalaman Anda menggunakan produk ini..."
                  className="w-full text-xs p-2.5 border rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 px-4 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? "Mengirim..." : "Kirim Ulasan"}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewingItemId(null)}
                  className="py-2 px-4 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition"
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
