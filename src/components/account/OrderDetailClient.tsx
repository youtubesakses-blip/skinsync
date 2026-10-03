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
  orderNumber: string;
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
  orderNumber,
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
  const [paying, setPaying] = useState<boolean>(false);
  const [payError, setPayError] = useState<string | null>(null);

  const openSnap = (token: string, fallbackUrl?: string | null) => {
    if (window.snap) {
      window.snap.pay(token, {
        onSuccess: () => router.refresh(),
        onPending: () => router.refresh(),
        onError: () => router.refresh(),
        onClose: () => router.refresh(),
      });
    } else if (fallbackUrl) {
      window.location.href = fallbackUrl;
    } else if (token) {
      // Snap script belum termuat — muat lalu buka popup
      const script = document.createElement("script");
      script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
      script.onload = () => {
        if (window.snap) {
          window.snap.pay(token, { onClose: () => router.refresh() });
        }
      };
      document.body.appendChild(script);
    }
  };

  const handlePayNow = async () => {
    setPayError(null);
    // Token sudah ada → langsung buka popup / redirect
    if (snapToken) {
      openSnap(snapToken, redirectUrl);
      return;
    }
    if (redirectUrl && !snapToken) {
      window.location.href = redirectUrl;
      return;
    }
    // Token belum ada (Midtrans sempat gagal saat checkout) → regenerasi via API
    setPaying(true);
    try {
      const res = await fetch(`/api/orders/${orderNumber}/pay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.error || "Gagal membuat link pembayaran. Coba lagi.");
        return;
      }
      if (data.snapToken) {
        openSnap(data.snapToken, data.redirectUrl);
      } else if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch {
      setPayError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setPaying(false);
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
    <div className="space-y-8">
      {/* Pay Now — hairline, satu tombol pink */}
      {orderStatus === "PENDING_PAYMENT" && (
        <div className="border border-[#070707] p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="furniture mb-1">Menunggu pembayaran</p>
            <p className="italic text-sm text-[#070707]/60">Selesaikan dalam 24 jam sebelum kedaluwarsa.</p>
            {payError && <p className="italic text-sm text-[#EF6F79] mt-1">{payError}</p>}
          </div>
          <button
            type="button"
            onClick={handlePayNow}
            disabled={paying}
            className="furniture bg-[#EF6F79] text-[#070707] px-6 py-3.5 hover:bg-[#070707] hover:text-white transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {paying ? "Membuat link…" : "Bayar sekarang →"}
          </button>
        </div>
      )}

      {/* Reviews — ruled rows, tanpa bintang warna-warni */}
      {orderStatus === "COMPLETED" && (
        <div>
          {reviewSuccess && (
            <p className="border border-[#070707] px-4 py-3 text-sm italic mb-5">{reviewSuccess}</p>
          )}

          <p className="furniture text-[#070707]/50 mb-2">Beri ulasan</p>
          <div className="border-t border-[#070707]">
            {items.map((item, i) => (
              <div
                key={item.id}
                className="py-4 border-b border-[#070707]/15 flex flex-wrap items-baseline justify-between gap-2 text-[15px]"
              >
                <p>
                  <span className="furniture text-[#EF6F79] mr-3">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-semibold">{item.productName}</span>{" "}
                  <span className="italic text-[#070707]/55">({item.variantName})</span>
                </p>
                {item.hasReview ? (
                  <span className="italic text-sm text-[#070707]/55">Ulasan terkirim</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setReviewingItemId(item.id);
                      setReviewError(null);
                    }}
                    className="furniture underline underline-offset-4 hover:italic"
                  >
                    Tulis ulasan
                  </button>
                )}
              </div>
            ))}
          </div>

          {reviewingItemId && (
            <form onSubmit={handleSendReview} className="mt-5 border border-[#070707] bg-[#F1F1ED] p-5 space-y-4">
              <p className="furniture">Tulis ulasan Anda</p>
              {reviewError && <p className="italic text-sm text-[#EF6F79]">{reviewError}</p>}
              <div>
                <label className="furniture text-[#070707]/55 block mb-2">Rating — {rating}/5</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star} bintang`}
                      className={`text-2xl leading-none transition-opacity ${star <= rating ? "text-[#070707]" : "text-[#070707]/25"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="furniture text-[#070707]/55 block mb-2">Kesan penggunaan — opsional</label>
                <textarea
                  rows={2}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Ceritakan pengalaman Anda…"
                  className="w-full bg-transparent border border-[#070707] px-4 py-3 text-[15px] focus:outline-none focus:bg-white placeholder:text-[#070707]/35 placeholder:italic"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="furniture bg-[#070707] text-white px-6 py-3 hover:bg-[#EF6F79] hover:text-[#070707] transition-colors disabled:opacity-50"
                >
                  {loading ? "Mengirim…" : "Kirim ulasan"}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewingItemId(null)}
                  className="furniture px-6 py-3 border border-[#070707] hover:italic"
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
