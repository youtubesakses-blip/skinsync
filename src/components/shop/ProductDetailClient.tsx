// src/components/shop/ProductDetailClient.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/money";
import { imageUrl } from "@/lib/image-url";

interface Variant {
  id: number;
  sku: string;
  name: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  isActive: boolean;
}

interface ProductImage {
  id: number;
  key: string;
  altText: string | null;
}

interface ProductDetailClientProps {
  productName: string;
  bpomNumber: string;
  variants: Variant[];
  images: ProductImage[];
  isLoggedIn: boolean;
  csPhone: string;
}

const DEFAULT_CS_PHONE = "628123456789";

export default function ProductDetailClient({
  productName,
  bpomNumber,
  variants,
  images,
  isLoggedIn,
  csPhone,
}: ProductDetailClientProps) {
  const router = useRouter();
  const [selectedVariantId, setSelectedVariantId] = useState<number>(
    variants[0]?.id ?? 0
  );
  const [qty, setQty] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) || variants[0];
  const activeImage = images[activeImageIndex];

  const handleAddToCart = async (redirectToCheckout = false) => {
    setMessage(null);

    // Rule: Guest menekan Tambah ke keranjang -> redirect ke /login?next=...
    if (!isLoggedIn) {
      const nextUrl = window.location.pathname;
      router.push(`/login?next=${encodeURIComponent(nextUrl)}`);
      return;
    }

    if (!selectedVariant || selectedVariant.stock < 1) {
      setMessage({ text: "Stok varian ini habis", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: selectedVariant.id,
          qty,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Gagal menambahkan ke keranjang", type: "error" });
        return;
      }

      if (redirectToCheckout) {
        router.push("/cart");
      } else {
        setMessage({ text: "Berhasil ditambahkan ke keranjang!", type: "success" });
        router.refresh();
      }
    } catch {
      setMessage({ text: "Terjadi kesalahan jaringan", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const csWaUrl = `https://wa.me/${csPhone || DEFAULT_CS_PHONE}?text=${encodeURIComponent(
    `Halo SkinSync CS, saya ingin bertanya tentang produk: ${productName} (BPOM: ${bpomNumber})`
  )}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
      {/* Galeri Produk */}
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute -inset-3 bg-gradient-to-br from-orange-200 via-rose-100 to-violet-200 rounded-[32px] blur-2xl opacity-60" />
          <div className="relative aspect-square bg-gradient-to-br from-[#fef3ee] to-[#fde7db] rounded-[28px] overflow-hidden border-[5px] border-white shadow-2xl shadow-orange-500/15">
            {activeImage ? (
              <Image
                src={imageUrl(activeImage.key)}
                alt={activeImage.altText || productName}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-8xl">
                🧴
              </div>
            )}
            {selectedVariant?.comparePrice && (
              <span className="absolute top-4 left-4 bg-[#f4733d] text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-lg">
                Hemat {formatRupiah(selectedVariant.comparePrice - selectedVariant.price)}!
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail Gallery */}
        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1">
            {images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                className={`relative w-20 h-20 rounded-2xl overflow-hidden border-[3px] flex-shrink-0 transition-all ${
                  idx === activeImageIndex
                    ? "border-[#f4733d] shadow-lg shadow-orange-500/20 scale-105"
                    : "border-white opacity-60 hover:opacity-100 shadow"
                }`}
              >
                <Image
                  src={imageUrl(img.key)}
                  alt={img.altText || "Thumbnail"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}

        {/* Garansi */}
        <div className="bg-white p-5 rounded-[24px] border border-[#2a1220]/8 text-[13px] text-[#2a1220]/70 space-y-2 shadow-sm">
          <p className="font-extrabold text-[#2a1220]">Kenapa belanja di SkinSync? ✨</p>
          <ul className="space-y-1.5 font-medium">
            <li>🧴 100% Original langsung dari pabrik resmi</li>
            <li>💬 Notifikasi & resi otomatis via WhatsApp</li>
            <li>📦 Kemasan aman standar farmasi</li>
          </ul>
        </div>
      </div>

      {/* Info & Tindakan */}
      <div className="flex flex-col space-y-5">
        <div className="space-y-4">
          {/* BPOM Label - Wajib tampil sesuai spesifikasi */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
              🛡️ BPOM: {bpomNumber}
            </span>
            <span className="text-xs font-semibold text-[#2a1220]/50">100% Original & Teruji Klinis</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-[#2a1220] leading-tight tracking-tight">
            {productName}
          </h1>

          {/* Harga */}
          {selectedVariant && (
            <div className="flex items-baseline gap-3 bg-white rounded-2xl border border-[#2a1220]/8 px-5 py-4 shadow-sm">
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#f4733d] to-[#e14b7a]">
                {formatRupiah(selectedVariant.price)}
              </span>
              {selectedVariant.comparePrice && (
                <span className="text-base text-[#2a1220]/35 line-through font-medium">
                  {formatRupiah(selectedVariant.comparePrice)}
                </span>
              )}
              <span className={`ml-auto text-xs font-extrabold px-2.5 py-1 rounded-full ${
                selectedVariant.stock > 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-600"
              }`}>
                {selectedVariant.stock > 0 ? `● Stok ${selectedVariant.stock}` : "● Habis"}
              </span>
            </div>
          )}

          {/* Pilihan Varian */}
          {variants.length > 0 && (
            <div className="pt-1">
              <label className="block text-sm font-extrabold text-[#2a1220] mb-2">
                Pilih Ukuran / Varian:
              </label>
              <div className="flex flex-wrap gap-2.5">
                {variants.map((v) => {
                  const isSelected = v.id === selectedVariant?.id;
                  const isOutOfStock = v.stock < 1;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => {
                        setSelectedVariantId(v.id);
                        setQty(1);
                      }}
                      className={`px-4 py-2.5 rounded-full text-sm font-bold border-2 transition-all ${
                        isSelected
                          ? "border-[#2a1220] bg-[#2a1220] text-white shadow-lg"
                          : isOutOfStock
                          ? "border-[#2a1220]/10 bg-[#2a1220]/5 text-[#2a1220]/30 cursor-not-allowed line-through"
                          : "border-[#2a1220]/15 text-[#2a1220] hover:border-[#f4733d] bg-white"
                      }`}
                    >
                      {v.name}
                      {isOutOfStock ? " (Habis)" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kuantitas */}
          {selectedVariant && selectedVariant.stock > 0 && (
            <div>
              <label className="block text-sm font-extrabold text-[#2a1220] mb-2">
                Jumlah:
              </label>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center bg-white border-2 border-[#2a1220]/10 rounded-full overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                    disabled={qty <= 1}
                    className="w-11 h-11 grid place-items-center text-lg font-bold text-[#2a1220] hover:bg-[#fef3ee] disabled:opacity-30 transition"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-extrabold text-[#2a1220]">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((prev) => Math.min(selectedVariant.stock, prev + 1))}
                    disabled={qty >= selectedVariant.stock}
                    className="w-11 h-11 grid place-items-center text-lg font-bold text-[#2a1220] hover:bg-[#fef3ee] disabled:opacity-30 transition"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs font-semibold text-[#2a1220]/50">
                  Maks. {selectedVariant.stock} pcs
                </span>
              </div>
            </div>
          )}

          {/* Status Message */}
          {message && (
            <div
              className={`p-3.5 rounded-2xl text-sm font-bold ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.type === "success" ? "✅ " : "⚠️ "}{message.text}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              disabled={loading || !selectedVariant || selectedVariant.stock < 1}
              onClick={() => handleAddToCart(false)}
              className="flex-1 py-4 px-6 rounded-full border-2 border-[#2a1220] text-[#2a1220] font-extrabold hover:bg-[#2a1220] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed text-center"
            >
              {loading ? "Memproses..." : "🛒 + Keranjang"}
            </button>
            <button
              type="button"
              disabled={loading || !selectedVariant || selectedVariant.stock < 1}
              onClick={() => handleAddToCart(true)}
              className="flex-1 py-4 px-6 rounded-full bg-gradient-to-r from-[#f4733d] to-[#e14b7a] text-white font-extrabold hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-orange-500/30 text-center"
            >
              ⚡ Beli Sekarang
            </button>
          </div>

          {/* CS WhatsApp button */}
          <a
            href={csWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-full bg-white border-2 border-emerald-200 text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            Konsultasi / Tanya CS via WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
