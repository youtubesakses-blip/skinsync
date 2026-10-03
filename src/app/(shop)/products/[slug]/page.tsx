// src/app/(shop)/products/[slug]/page.tsx
// Detail produk Aurelle — hairline, serif, satu aksen pink.

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import ProductDetailClient from "@/components/shop/ProductDetailClient";
import Link from "next/link";
import { formatRupiah } from "@/lib/money";
import type { Metadata } from "next";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug, isActive: true, deletedAt: null },
  });
  if (!product) return { title: "Produk Tidak Ditemukan — SkinSync" };
  return {
    title: `${product.name} — BPOM: ${product.bpomNumber}`,
    description: product.description.slice(0, 160),
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
      variants: { where: { isActive: true }, orderBy: { price: "asc" } },
      reviews: {
        where: { status: "APPROVED" },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) notFound();

  const relatedProducts = await db.product.findMany({
    where: { categoryId: product.categoryId, id: { not: product.id }, isActive: true, deletedAt: null },
    include: {
      variants: { where: { isActive: true }, orderBy: { price: "asc" }, take: 1 },
    },
    take: 4,
  });

  const csSetting = await db.setting.findUnique({ where: { key: "store_cs_phone" } });
  const csPhone =
    csSetting && typeof csSetting.value === "string" && csSetting.value.trim()
      ? csSetting.value.trim()
      : "628123456789";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.variants[0]?.sku || "",
    mpn: product.bpomNumber,
    brand: { "@type": "Brand", name: product.brand?.name || "SkinSync" },
    offers: {
      "@type": "Offer",
      priceCurrency: "IDR",
      price: product.variants[0]?.price || 0,
      availability: (product.variants[0]?.stock || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="bg-[#F7F7F4] text-[#070707]">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-24 pb-20">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <p className="furniture text-[#070707]/50 mb-8">
          <Link href="/" className="hover:italic">Beranda</Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:italic">Katalog</Link>
          <span className="mx-2">/</span>
          <Link href={`/categories/${product.category.slug}`} className="hover:italic">{product.category.name}</Link>
          <span className="mx-2">/</span>
          <span className="text-[#070707]">{product.name}</span>
        </p>

        <ProductDetailClient
          productName={product.name}
          bpomNumber={product.bpomNumber}
          variants={product.variants}
          images={product.images}
          isLoggedIn={!!session}
          csPhone={csPhone}
        />

        <div className="grid md:grid-cols-3 gap-10 mt-16 pt-10 border-t border-[#070707]">
          <div className="md:col-span-2 space-y-10">
            <section>
              <p className="furniture text-[#070707]/50 mb-3">01 — Deskripsi</p>
              <div className="text-[15px] leading-relaxed whitespace-pre-line max-w-2xl">{product.description}</div>
            </section>
            <section className="border-t border-[#070707]/20 pt-10">
              <p className="furniture text-[#070707]/50 mb-3">02 — Cara pakai</p>
              <div className="text-[15px] leading-relaxed whitespace-pre-line max-w-2xl">{product.howToUse}</div>
            </section>
            <section className="border-t border-[#070707]/20 pt-10">
              <p className="furniture text-[#070707]/50 mb-3">03 — Komposisi</p>
              <p className="italic text-sm leading-relaxed bg-[#F1F1ED] border border-[#070707]/20 p-5 max-w-2xl">{product.ingredients}</p>
            </section>

            <section className="border-t border-[#070707]/20 pt-10">
              <div className="flex items-baseline justify-between mb-6">
                <p className="furniture text-[#070707]/50">04 — Ulasan terverifikasi</p>
                <p className="italic text-sm">{product.avgRating.toFixed(1)} — {product.reviewCount} ulasan</p>
              </div>
              {product.reviews.length === 0 ? (
                <p className="italic text-[#070707]/55">Belum ada ulasan. Jadilah yang pertama.</p>
              ) : (
                <div className="border-t border-[#070707]">
                  {product.reviews.map((rev) => (
                    <div key={rev.id} className="py-4 border-b border-[#070707]/20">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="font-semibold text-[15px]">{rev.user.name}</p>
                        <p className="italic text-xs text-[#070707]/50">
                          {new Date(rev.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} — {rev.rating}/5
                        </p>
                      </div>
                      {rev.body && <p className="italic text-[15px] text-[#070707]/75 mt-1">“{rev.body}”</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside>
            <div className="bg-[#070707] text-[#F7F7F4] p-6">
              <p className="furniture text-[#F7F7F4]/50 mb-4">Kesesuaian kulit</p>
              {product.skinTypes.length > 0 && (
                <div className="mb-4">
                  <p className="italic text-xs text-[#F7F7F4]/60 mb-2">Jenis kulit</p>
                  <p className="text-[15px]">{product.skinTypes.map((s) => s.name).join(", ")}</p>
                </div>
              )}
              {product.skinConcerns.length > 0 && (
                <div className="mb-4">
                  <p className="italic text-xs text-[#F7F7F4]/60 mb-2">Masalah kulit</p>
                  <p className="text-[15px]">{product.skinConcerns.map((s) => s.name).join(", ")}</p>
                </div>
              )}
              <div className="border-t border-white/20 pt-4 mt-4 furniture text-[#F7F7F4]/60 space-y-1.5">
                <p>Brand — {product.brand.name}</p>
                <p>Kategori — {product.category.name}</p>
                <p>BPOM — {product.bpomNumber}</p>
              </div>
            </div>
          </aside>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-16 pt-10 border-t border-[#070707]">
            <div className="flex items-baseline justify-between mb-2">
              <p className="furniture text-[#070707]/50">Mungkin juga cocok</p>
              <Link href="/products" className="furniture underline underline-offset-4">Semua</Link>
            </div>
            <div className="border-t border-[#070707]">
              {relatedProducts.map((rel, i) => (
                <Link key={rel.id} href={`/products/${rel.slug}`} className="group grid grid-cols-[auto_1fr_auto] items-baseline gap-x-5 py-4 border-b border-[#070707]/25">
                  <span className="furniture text-[#EF6F79]">0{i + 1}</span>
                  <span className="text-lg font-medium group-hover:italic transition-all">{rel.name}</span>
                  <span className="font-semibold text-[#EF6F79]">{formatRupiah(rel.variants[0]?.price ?? 0)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
