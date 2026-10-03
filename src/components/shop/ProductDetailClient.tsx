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
  const [selectedVariantId, setSelectedVariantId] = useState<number>(variants[0]?.id ?? 0);
  const [qty, setQty] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) || variants[0];
  const activeImage = images[activeImageIndex];

  const handleAddToCart = async (redirectToCheckout = false) => {
    setMessage(null);
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!selectedVariant || selectedVariant.stock < 1) {
      setMessage({ text: "Stok varian ini habis.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selectedVariant.id, qty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Gagal menambahkan ke keranjang.", type: "error" });
        return;
      }
      if (redirectToCheckout) router.push("/cart");
      else {
        setMessage({ text: "Masuk keranjang. Lanjut checkout bila sudah pas.", type: "success" });
        router.refresh();
      }
    } catch {
      setMessage({ text: "Jaringan bermasalah. Coba lagi.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const csWaUrl = `https://wa.me/${csPhone || DEFAULT_CS_PHONE}?text=${encodeURIComponent(
    `Halo SkinSync CS, saya ingin bertanya tentang produk: ${productName} (BPOM: ${bpomNumber})`
  )}`;

  return (
    <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
      {/* Galeri — square frame, hairline */}
      <div>
        <div className="relative aspect-square bg-[#E4E5E0] border border-[#070707] overflow-hidden">
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
            <div className="w-full h-full grid place-items-center italic text-[#070707]/40">Tanpa foto</div>
          )}
          {selectedVariant?.comparePrice && (
            <span className="absolute top-3 left-3 bg-[#EF6F79] text-white furniture px-3 py-1.5">
              Hemat {formatRupiah(selectedVariant.comparePrice - selectedVariant.price)}
            </span>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 mt-2 overflow-x-auto thin-scroll">
            {images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                className={`relative w-20 h-20 shrink-0 overflow-hidden border ${
                  idx === activeImageIndex ? "border-[#EF6F79]" : "border-[#070707]/25 opacity-60 hover:opacity-100"
                }`}
              >
                <Image src={imageUrl(img.key)} alt={img.altText || "Foto"} fill className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        )}
        <div className="mt-6 border-t border-[#070707] pt-4 furniture text-[#070707]/60 space-y-1.5">
          <p>01 — 100% original dari pabrik resmi</p>
          <p>02 — Resi otomatis via WhatsApp</p>
          <p>03 — Kemasan standar farmasi</p>
        </div>
      </div>

      {/* Info */}
      <div>
        <p className="furniture text-[#070707]/50">BPOM — {bpomNumber}</p>
        <h1 className="display-tight text-4xl sm:text-5xl font-medium mt-3">{productName}</h1>

        {selectedVariant && (
          <div className="flex items-baseline gap-3 mt-5 py-4 border-y border-[#070707]">
            <span className="text-3xl font-semibold text-[#EF6F79]">{formatRupiah(selectedVariant.price)}</span>
            {selectedVariant.comparePrice && (
              <span className="italic text-[#070707]/40 line-through">{formatRupiah(selectedVariant.comparePrice)}</span>
            )}
            <span className="ml-auto furniture text-[#070707]/60">
              {selectedVariant.stock > 0 ? `Stok ${selectedVariant.stock}` : "Habis"}
            </span>
          </div>
        )}

        {variants.length > 0 && (
          <div className="mt-6">
            <p className="furniture text-[#070707]/50 mb-2">Ukuran / varian</p>
            <div className="border-t border-[#070707]">
              {variants.map((v, i) => {
                const isSelected = v.id === selectedVariant?.id;
                const out = v.stock < 1;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={out}
                    onClick={() => { setSelectedVariantId(v.id); setQty(1); }}
                    className={`w-full flex items-baseline gap-4 py-3 border-b border-[#070707]/20 text-left ${
                      out ? "opacity-35 cursor-not-allowed" : "hover:italic"
                    } ${isSelected ? "font-semibold" : ""}`}
                  >
                    <span className="furniture text-[#EF6F79]">0{i + 1}</span>
                    <span className="text-lg">{v.name}{out ? " — habis" : ""}</span>
                    <span className="ml-auto italic text-sm text-[#070707]/60">{formatRupiah(v.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedVariant && selectedVariant.stock > 0 && (
          <div className="mt-6 flex items-center gap-4">
            <p className="furniture text-[#070707]/50">Jumlah</p>
            <div className="inline-flex items-center border border-[#070707]">
              <button type="button" onClick={() => setQty((p) => Math.max(1, p - 1))} disabled={qty <= 1} className="w-10 h-10 grid place-items-center text-lg hover:bg-[#E4E5E0] disabled:opacity-30">−</button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button type="button" onClick={() => setQty((p) => Math.min(selectedVariant.stock, p + 1))} disabled={qty >= selectedVariant.stock} className="w-10 h-10 grid place-items-center text-lg hover:bg-[#E4E5E0] disabled:opacity-30">+</button>
            </div>
            <span className="italic text-xs text-[#070707]/50">Maks. {selectedVariant.stock}</span>
          </div>
        )}

        {message && (
          <p className={`mt-5 italic text-sm border-t border-[#070707] pt-3 ${message.type === "success" ? "text-[#070707]" : "text-[#EF6F79]"}`}>
            {message.text}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={loading || !selectedVariant || selectedVariant.stock < 1}
            onClick={() => handleAddToCart(false)}
            className="flex-1 py-4 px-6 border border-[#070707] furniture hover:bg-[#070707] hover:text-white transition-colors disabled:opacity-40"
          >
            {loading ? "Memproses…" : "+ Keranjang"}
          </button>
          <button
            type="button"
            disabled={loading || !selectedVariant || selectedVariant.stock < 1}
            onClick={() => handleAddToCart(true)}
            className="flex-1 py-4 px-6 bg-[#EF6F79] text-white furniture hover:bg-[#070707] transition-colors disabled:opacity-40"
          >
            Beli sekarang
          </button>
        </div>

        <a href={csWaUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block text-center furniture underline underline-offset-4 py-3">
          Tanya CS via WhatsApp
        </a>
      </div>
    </div>
  );
}
