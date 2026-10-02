// src/app/(shop)/products/[slug]/page.tsx
// Halaman detail produk lengkap: galeri, varian, BPOM, deskripsi, komposisi, cara pakai, ulasan approved, produk terkait

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import ProductDetailClient from "@/components/shop/ProductDetailClient";
import Link from "next/link";
import Image from "next/image";
import { imageUrl } from "@/lib/image-url";
import { formatRupiah } from "@/lib/money";
import type { Metadata } from "next";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    include: { images: { take: 1 } },
  });

  if (!product) {
    return { title: "Produk Tidak Ditemukan — SkinSync" };
  }

  const image = product.images[0] ? imageUrl(product.images[0].key) : undefined;

  return {
    title: `${product.name} — BPOM: ${product.bpomNumber}`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: image ? [{ url: image }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const session = await getSession();

  const product = await db.product.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      brand: true,
      category: true,
      skinTypes: true,
      skinConcerns: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        where: { isActive: true },
        orderBy: { price: "asc" },
      },
      reviews: {
        where: { status: "APPROVED" },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) {
    notFound();
  }

  // Produk terkait dalam kategori yang sama
  const relatedProducts = await db.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
      isActive: true,
      deletedAt: null,
    },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: { where: { isActive: true }, orderBy: { price: "asc" }, take: 1 },
    },
    take: 4,
  });

  // Nomor CS dari pengaturan toko (bisa diubah Super Admin), fallback bila kosong
  const csSetting = await db.setting.findUnique({ where: { key: "store_cs_phone" } });
  const csPhone =
    csSetting && typeof csSetting.value === "string" && csSetting.value.trim()
      ? csSetting.value.trim()
      : "628123456789";

  // Schema.org structured data (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.variants[0]?.sku || "",
    mpn: product.bpomNumber,
    brand: {
      "@type": "Brand",
      name: product.brand?.name || "SkinSync",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "IDR",
      price: product.variants[0]?.price || 0,
      availability:
        (product.variants[0]?.stock || 0) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
    aggregateRating:
      product.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.avgRating,
            reviewCount: product.reviewCount,
          }
        : undefined,
  };

  return (
    <div className="bg-[#fff8f3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Structured Data Script */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Breadcrumb */}
        <nav className="text-[13px] font-semibold text-[#2a1220]/50">
          <Link href="/" className="hover:text-[#f4733d] transition">Beranda</Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:text-[#f4733d] transition">Katalog</Link>
          <span className="mx-2">/</span>
          <Link href={`/categories/${product.category.slug}`} className="hover:text-[#f4733d] transition">
            {product.category.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#2a1220] truncate">{product.name}</span>
        </nav>

        {/* Hero Section: Client component with gallery & variants */}
        <ProductDetailClient
          productName={product.name}
          bpomNumber={product.bpomNumber}
          variants={product.variants}
          images={product.images}
          isLoggedIn={!!session}
          csPhone={csPhone}
        />

        {/* Spesifikasi & Kandungan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-8 border-t border-[#2a1220]/10">
          <div className="md:col-span-2 space-y-5">
            {/* Deskripsi */}
            <section className="bg-white p-6 sm:p-7 rounded-[24px] border border-[#2a1220]/8 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-[#2a1220] flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f4733d] to-[#e14b7a] grid place-items-center text-white text-sm">✦</span>
                Deskripsi Produk
              </h2>
              <div className="text-[#2a1220]/70 text-sm leading-relaxed whitespace-pre-line font-medium">
                {product.description}
              </div>
            </section>

            {/* Cara Pakai */}
            <section className="bg-white p-6 sm:p-7 rounded-[24px] border border-[#2a1220]/8 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-[#2a1220] flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-white text-sm">☀️</span>
                Cara Penggunaan
              </h2>
              <div className="text-[#2a1220]/70 text-sm leading-relaxed whitespace-pre-line font-medium">
                {product.howToUse}
              </div>
            </section>

            {/* Komposisi Lengkap */}
            <section className="bg-white p-6 sm:p-7 rounded-[24px] border border-[#2a1220]/8 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-[#2a1220] flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 grid place-items-center text-white text-sm">🧪</span>
                Komposisi Lengkap (Ingredients)
              </h2>
              <p className="text-xs text-[#2a1220]/60 leading-relaxed font-mono bg-[#fef3ee] p-4 rounded-2xl border border-[#f4733d]/15">
                {product.ingredients}
              </p>
            </section>

            {/* Ulasan Pelanggan (Approved Only) */}
            <section className="bg-white p-6 sm:p-7 rounded-[24px] border border-[#2a1220]/8 shadow-sm space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-[#2a1220]">Ulasan Pembeli Terverifikasi ✓</h2>
                  <p className="text-xs text-[#2a1220]/50 mt-0.5 font-medium">
                    Ulasan asli dari pembeli yang telah menerima pesanan ini
                  </p>
                </div>
                <div className="text-right shrink-0 bg-[#fef3ee] rounded-2xl px-4 py-2">
                  <div className="text-2xl font-black text-[#2a1220]">
                    <span className="text-amber-400">★</span> {product.avgRating.toFixed(1)}
                  </div>
                  <div className="text-[11px] text-[#2a1220]/50 font-semibold">({product.reviewCount} ulasan)</div>
                </div>
              </div>

              {product.reviews.length === 0 ? (
                <div className="text-center py-8 text-[#2a1220]/40 text-sm font-medium bg-[#fef3ee]/60 rounded-2xl border border-dashed border-[#2a1220]/15">
                  💬 Belum ada ulasan untuk produk ini. Jadilah yang pertama!
                </div>
              ) : (
                <div className="space-y-4">
                  {product.reviews.map((rev) => (
                    <div key={rev.id} className="bg-[#fff8f3] rounded-2xl p-4 border border-[#2a1220]/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-[#2a1220]">
                          {rev.user.name}
                        </span>
                        <span className="text-[11px] font-medium text-[#2a1220]/45">
                          {new Date(rev.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="text-amber-400 text-xs mb-1.5 tracking-wider">
                        {"★".repeat(rev.rating)}
                        <span className="text-[#2a1220]/15">{"★".repeat(5 - rev.rating)}</span>
                      </div>
                      {rev.body && <p className="text-sm text-[#2a1220]/70 font-medium">{rev.body}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Info & Tags */}
          <aside className="space-y-5">
            {/* Cocok Untuk */}
            <div className="bg-[#2a1220] p-6 rounded-[24px] shadow-xl space-y-4 text-white">
              <h3 className="font-extrabold text-sm tracking-wide">✨ KESESUAIAN KULIT</h3>

              {product.skinTypes.length > 0 && (
                <div>
                  <span className="text-[11px] text-white/50 block mb-1.5 font-bold uppercase tracking-wider">Jenis Kulit:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {product.skinTypes.map((st) => (
                      <span
                        key={st.id}
                        className="px-3 py-1 bg-white/10 border border-white/15 text-xs rounded-full font-bold"
                      >
                        {st.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.skinConcerns.length > 0 && (
                <div>
                  <span className="text-[11px] text-white/50 block mb-1.5 font-bold uppercase tracking-wider">Masalah Kulit:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {product.skinConcerns.map((sc) => (
                      <span
                        key={sc.id}
                        className="px-3 py-1 bg-[#f4733d]/25 border border-[#f4733d]/40 text-xs rounded-full font-bold"
                      >
                        {sc.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-white/10 text-xs text-white/60 space-y-1.5 font-medium">
                <div><span className="font-bold text-white">Brand:</span> {product.brand.name}</div>
                <div><span className="font-bold text-white">Kategori:</span> {product.category.name}</div>
                <div><span className="font-bold text-white">BPOM:</span> <span className="font-mono">{product.bpomNumber}</span></div>
              </div>
            </div>

            {/* Bantuan */}
            <div className="bg-white p-6 rounded-[24px] border border-[#2a1220]/8 shadow-sm text-center">
              <p className="text-3xl mb-2">💬</p>
              <p className="font-extrabold text-[#2a1220] text-sm">Masih ragu cocok atau tidak?</p>
              <p className="text-xs text-[#2a1220]/55 font-medium mt-1 mb-4">
                Konsultasikan jenis kulitmu gratis dengan CS kami.
              </p>
              <Link
                href="/faq"
                className="inline-block text-xs font-bold text-[#f4733d] hover:underline"
              >
                Baca panduan di FAQ →
              </Link>
            </div>
          </aside>
        </div>

        {/* Produk Terkait */}
        {relatedProducts.length > 0 && (
          <section className="pt-8 border-t border-[#2a1220]/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-[#2a1220] tracking-tight">
                Kamu mungkin juga suka 💕
              </h2>
              <Link href="/products" className="text-sm font-bold text-[#f4733d] hover:underline">
                Lihat semua →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map((rel) => {
                const relPrice = rel.variants[0]?.price ?? 0;
                const relImg = rel.images[0];
                return (
                  <Link
                    key={rel.id}
                    href={`/products/${rel.slug}`}
                    className="group bg-white rounded-[20px] border border-[#2a1220]/8 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all overflow-hidden flex flex-col"
                  >
                    <div className="relative aspect-square bg-gradient-to-br from-[#fef3ee] to-[#fde7db]">
                      {relImg && (
                        <Image
                          src={imageUrl(relImg.key)}
                          alt={rel.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          unoptimized
                        />
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <h3 className="text-xs font-bold text-[#2a1220] line-clamp-2 mb-1">
                        {rel.name}
                      </h3>
                      <p className="text-sm font-black text-[#2a1220]">
                        {formatRupiah(relPrice)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
