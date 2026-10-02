// src/app/(shop)/products/page.tsx
// Daftar produk publik dengan pencarian, filter, urutan, dan pagination

import { db } from "@/lib/db";
import type { Prisma } from "../../../../generated/prisma/client";
import { imageUrl } from "@/lib/image-url";
import { formatRupiah } from "@/lib/money";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Katalog Produk Skincare — SkinSync",
  description:
    "Jelajahi rangkaian produk perawatan kulit terbaik kami yang diformulasikan untuk kebutuhan kulit Anda.",
};

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    skinType?: string;
    skinConcern?: string;
    brand?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    page?: string;
  }>;
}

function buildUrl(
  params: Record<string, string | undefined>,
  overrides: Record<string, string>
) {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...params, ...overrides })) {
    if (v !== undefined && v !== "") merged[k] = v;
  }
  const qs = new URLSearchParams(merged).toString();
  return `/products${qs ? `?${qs}` : ""}`;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const q = params.q || "";
  const categorySlug = params.category || "";
  const skinTypeSlug = params.skinType || "";
  const skinConcernSlug = params.skinConcern || "";
  const brandSlug = params.brand || "";
  const sort = params.sort || "newest";
  const minPrice = params.minPrice ? parseInt(params.minPrice, 10) : undefined;
  const maxPrice = params.maxPrice ? parseInt(params.maxPrice, 10) : undefined;
  const page = parseInt(params.page || "1", 10);
  const pageSize = 12;

  // Build Prisma where filter
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    deletedAt: null,
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (skinTypeSlug) {
    where.skinTypes = { some: { slug: skinTypeSlug } };
  }

  if (skinConcernSlug) {
    where.skinConcerns = { some: { slug: skinConcernSlug } };
  }

  if (brandSlug) {
    where.brand = { slug: brandSlug };
  }

  // Sorting
  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "rating") {
    orderBy = { avgRating: "desc" };
  } else if (sort === "price-asc" || sort === "price-desc") {
    orderBy = { createdAt: "desc" };
  }

  const [totalCount, products, categories, skinTypes, skinConcerns, brands] =
    await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          skinTypes: true,
          skinConcerns: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variants: {
            where: { isActive: true },
            orderBy: { price: "asc" },
          },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      db.skinType.findMany({ orderBy: { name: "asc" } }),
      db.skinConcern.findMany({ orderBy: { name: "asc" } }),
      db.brand.findMany({ orderBy: { name: "asc" } }),
    ]);

  // Client filtering for variant price if minPrice/maxPrice provided
  let filteredProducts = products;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filteredProducts = products.filter((prod) => {
      const minVPrice = prod.variants[0]?.price ?? 0;
      if (minPrice !== undefined && minVPrice < minPrice) return false;
      if (maxPrice !== undefined && minVPrice > maxPrice) return false;
      return true;
    });
  }

  if (sort === "price-asc") {
    filteredProducts.sort((a, b) => (a.variants[0]?.price ?? 0) - (b.variants[0]?.price ?? 0));
  } else if (sort === "price-desc") {
    filteredProducts.sort((a, b) => (b.variants[0]?.price ?? 0) - (a.variants[0]?.price ?? 0));
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasActiveFilter =
    !!q || !!categorySlug || !!skinTypeSlug || !!skinConcernSlug || !!brandSlug;

  const activeChips: { label: string; href: string }[] = [];
  if (q) activeChips.push({ label: `🔍 “${q}”`, href: buildUrl(params, { q: "", page: "1" }) });
  if (categorySlug) {
    const c = categories.find((x) => x.slug === categorySlug);
    activeChips.push({ label: c?.name ?? categorySlug, href: buildUrl(params, { category: "", page: "1" }) });
  }
  if (skinTypeSlug) {
    const s = skinTypes.find((x) => x.slug === skinTypeSlug);
    activeChips.push({ label: s?.name ?? skinTypeSlug, href: buildUrl(params, { skinType: "", page: "1" }) });
  }
  if (skinConcernSlug) {
    const s = skinConcerns.find((x) => x.slug === skinConcernSlug);
    activeChips.push({ label: s?.name ?? skinConcernSlug, href: buildUrl(params, { skinConcern: "", page: "1" }) });
  }
  if (brandSlug) {
    const b = brands.find((x) => x.slug === brandSlug);
    activeChips.push({ label: b?.name ?? brandSlug, href: buildUrl(params, { brand: "", page: "1" }) });
  }

  const filterLink = (active: boolean, href: string, label: string) => (
    <Link
      key={label}
      href={href}
      className={`block px-3 py-1.5 rounded-full transition text-[13px] font-semibold ${
        active
          ? "bg-[#2a1220] text-white shadow"
          : "text-[#2a1220]/60 hover:text-[#2a1220] hover:bg-[#fde7db]"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="bg-[#fff8f3]">
      {/* Header banner */}
      <div className="relative overflow-hidden bg-[#2a1220]">
        <div className="absolute -top-20 right-10 w-72 h-72 rounded-full bg-[#f4733d]/25 blur-3xl" />
        <div className="absolute -bottom-24 left-10 w-72 h-72 rounded-full bg-[#7c3aed]/25 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="text-sm text-white/50 mb-2 font-medium">
            <Link href="/" className="hover:text-white transition">Beranda</Link>
            <span className="mx-2">/</span>
            <span className="text-white font-semibold">Katalog Produk</span>
          </div>
          <h1 className="text-3xl sm:text-[44px] font-black tracking-tight text-white leading-tight">
            Temukan ritual{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-[#f4733d] to-[#e14b7a]">
              glow
            </span>{" "}
            versimu ✨
          </h1>
          <p className="text-white/60 text-sm mt-2 font-medium">
            Menampilkan {filteredProducts.length} dari {totalCount} produk · 100% BPOM & original
          </p>
          {/* Search */}
          <form method="GET" action="/products" className="mt-6 max-w-xl">
            <div className="flex items-center bg-white rounded-full p-1.5 pl-5 shadow-xl">
              <span className="text-lg mr-2">🔍</span>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Cari serum, toner, sunscreen..."
                className="flex-1 bg-transparent text-sm font-medium text-[#2a1220] placeholder:text-[#2a1220]/40 focus:outline-none"
              />
              {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
              {skinTypeSlug && <input type="hidden" name="skinType" value={skinTypeSlug} />}
              {skinConcernSlug && <input type="hidden" name="skinConcern" value={skinConcernSlug} />}
              {brandSlug && <input type="hidden" name="brand" value={brandSlug} />}
              <button
                type="submit"
                className="bg-[#2a1220] text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-[#f4733d] transition"
              >
                Cari
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs font-bold text-[#2a1220]/50 uppercase tracking-wider">
              Filter aktif:
            </span>
            {activeChips.map((chip) => (
              <Link
                key={chip.label}
                href={chip.href}
                title="Hapus filter ini"
                className="inline-flex items-center gap-1.5 bg-white border border-[#f4733d]/40 text-[#2a1220] text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#fde7db] transition"
              >
                {chip.label} <span className="text-[#f4733d]">✕</span>
              </Link>
            ))}
            <Link
              href="/products"
              className="text-xs font-bold text-[#f4733d] hover:underline"
            >
              Reset semua
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Sidebar Filter */}
          <aside className="lg:col-span-1 bg-white p-5 rounded-[24px] border border-[#2a1220]/8 shadow-sm lg:sticky lg:top-32 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[#2a1220]">
                🎛️ Filter Produk
              </h2>
              {hasActiveFilter && (
                <Link
                  href="/products"
                  className="text-[11px] font-bold text-[#f4733d] hover:underline"
                >
                  Reset
                </Link>
              )}
            </div>

            <div>
              <h3 className="text-[11px] font-extrabold text-[#2a1220]/50 uppercase tracking-wider mb-2">
                Kategori
              </h3>
              <div className="space-y-1">
                {filterLink(!categorySlug, buildUrl(params, { category: "", page: "1" }), "Semua Kategori")}
                {categories.map((c) =>
                  filterLink(categorySlug === c.slug, buildUrl(params, { category: c.slug, page: "1" }), c.name)
                )}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-extrabold text-[#2a1220]/50 uppercase tracking-wider mb-2">
                Jenis Kulit
              </h3>
              <div className="space-y-1">
                {filterLink(!skinTypeSlug, buildUrl(params, { skinType: "", page: "1" }), "Semua Jenis Kulit")}
                {skinTypes.map((st) =>
                  filterLink(skinTypeSlug === st.slug, buildUrl(params, { skinType: st.slug, page: "1" }), st.name)
                )}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-extrabold text-[#2a1220]/50 uppercase tracking-wider mb-2">
                Masalah Kulit
              </h3>
              <div className="space-y-1">
                {filterLink(!skinConcernSlug, buildUrl(params, { skinConcern: "", page: "1" }), "Semua Masalah")}
                {skinConcerns.map((sc) =>
                  filterLink(skinConcernSlug === sc.slug, buildUrl(params, { skinConcern: sc.slug, page: "1" }), sc.name)
                )}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-extrabold text-[#2a1220]/50 uppercase tracking-wider mb-2">
                Brand
              </h3>
              <div className="space-y-1">
                {filterLink(!brandSlug, buildUrl(params, { brand: "", page: "1" }), "Semua Brand")}
                {brands.map((b) =>
                  filterLink(brandSlug === b.slug, buildUrl(params, { brand: b.slug, page: "1" }), b.name)
                )}
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-3 space-y-6">
            {/* Sort bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-[20px] border border-[#2a1220]/8 shadow-sm">
              <div className="text-[13px] font-bold text-[#2a1220]/60">
                Urutkan:
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "🆕 Terbaru", value: "newest" },
                  { label: "⭐ Rating", value: "rating" },
                  { label: "💰 Termurah", value: "price-asc" },
                  { label: "💎 Termahal", value: "price-desc" },
                ].map((s) => (
                  <Link
                    key={s.value}
                    href={buildUrl(params, { sort: s.value, page: "1" })}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                      sort === s.value
                        ? "bg-[#2a1220] text-white shadow"
                        : "bg-[#fef3ee] text-[#2a1220]/70 hover:bg-[#fde7db]"
                    }`}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-[28px] p-12 text-center border border-dashed border-[#2a1220]/20">
                <p className="text-6xl mb-4">🔍</p>
                <h3 className="text-lg font-extrabold text-[#2a1220] mb-1">
                  Produk tidak ditemukan
                </h3>
                <p className="text-sm text-[#2a1220]/55 font-medium">
                  Coba ubah kata kunci atau bersihkan filter.
                </p>
                <Link
                  href="/products"
                  className="inline-block mt-5 text-sm font-bold bg-[#2a1220] text-white px-6 py-2.5 rounded-full hover:bg-[#f4733d] transition"
                >
                  Lihat Semua Produk
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                {filteredProducts.map((product) => {
                  const firstVariant = product.variants[0];
                  const firstImage = product.images[0];
                  const discount = firstVariant?.comparePrice
                    ? Math.round(
                        ((firstVariant.comparePrice - firstVariant.price) /
                          firstVariant.comparePrice) *
                          100
                      )
                    : 0;

                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      className="group bg-white rounded-[24px] border border-[#2a1220]/8 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-orange-500/15 hover:-translate-y-1.5 transition-all duration-300 flex flex-col"
                    >
                      <div className="relative aspect-square bg-gradient-to-br from-[#fef3ee] to-[#fde7db] overflow-hidden">
                        {firstImage ? (
                          <Image
                            src={imageUrl(firstImage.key)}
                            alt={firstImage.altText || product.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-6xl">
                            🧴
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          {product.brand && (
                            <span className="bg-white/90 backdrop-blur text-[10px] font-extrabold px-2.5 py-1 rounded-full text-[#2a1220] shadow-sm w-fit">
                              {product.brand.name}
                            </span>
                          )}
                          {discount > 0 && (
                            <span className="bg-[#f4733d] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full w-fit">
                              -{discount}%
                            </span>
                          )}
                        </div>
                        <div className="absolute inset-x-3 bottom-3 translate-y-14 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                          <span className="block text-center bg-[#2a1220]/90 backdrop-blur text-white text-[13px] font-bold py-2.5 rounded-full">
                            Lihat Detail →
                          </span>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-[11px] font-bold tracking-wider uppercase text-[#f4733d] mb-1">
                            {product.category?.name}
                          </p>
                          <h3 className="text-sm font-bold text-[#2a1220] line-clamp-2 mb-2 min-h-[40px] leading-snug">
                            {product.name}
                          </h3>
                        </div>
                        <div className="mt-1">
                          {firstVariant ? (
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-[15px] font-black text-[#2a1220]">
                                {formatRupiah(firstVariant.price)}
                              </span>
                              {firstVariant.comparePrice && (
                                <span className="text-xs text-[#2a1220]/40 line-through font-medium">
                                  {formatRupiah(firstVariant.comparePrice)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#2a1220]/40">Tidak ada varian aktif</span>
                          )}
                          <div className="flex items-center justify-between text-xs mt-2">
                            <span className="flex items-center gap-1 font-bold text-[#2a1220]">
                              <span className="text-amber-400">★</span>
                              {product.avgRating.toFixed(1)}
                              <span className="text-[#2a1220]/40 font-medium">({product.reviewCount})</span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              ✓ BPOM
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-4">
                {page > 1 && (
                  <Link
                    href={buildUrl(params, { page: (page - 1).toString() })}
                    className="h-10 px-4 flex items-center rounded-full text-sm font-bold bg-white text-[#2a1220] border border-[#2a1220]/10 hover:border-[#f4733d] transition"
                  >
                    ← Prev
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={buildUrl(params, { page: p.toString() })}
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold transition ${
                      p === page
                        ? "bg-[#2a1220] text-white shadow-lg"
                        : "bg-white text-[#2a1220]/70 border border-[#2a1220]/10 hover:border-[#f4733d]"
                    }`}
                  >
                    {p}
                  </Link>
                ))}
                {page < totalPages && (
                  <Link
                    href={buildUrl(params, { page: (page + 1).toString() })}
                    className="h-10 px-4 flex items-center rounded-full text-sm font-bold bg-white text-[#2a1220] border border-[#2a1220]/10 hover:border-[#f4733d] transition"
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
