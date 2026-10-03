// src/app/(shop)/products/page.tsx
// Katalog Aurelle — ruled rows, hairline, satu aksen pink.

import { db } from "@/lib/db";
import type { Prisma } from "../../../../generated/prisma/client";
import { imageUrl } from "@/lib/image-url";
import { formatRupiah } from "@/lib/money";
import Link from "next/link";
import type { Metadata } from "next";
import ProductIndexList, { type IndexItem } from "@/components/shop/ProductIndexList";

export const metadata: Metadata = {
  title: "Katalog Produk Skincare — SkinSync",
  description:
    "Niacinamide 5%, ceramide, SPF 50 — batch kecil, BPOM RI.",
};

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    skinType?: string;
    skinConcern?: string;
    brand?: string;
    sort?: string;
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
  const page = parseInt(params.page || "1", 10);
  const pageSize = 12;

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
  if (categorySlug) where.category = { slug: categorySlug };
  if (skinTypeSlug) where.skinTypes = { some: { slug: skinTypeSlug } };
  if (skinConcernSlug) where.skinConcerns = { some: { slug: skinConcernSlug } };
  if (brandSlug) where.brand = { slug: brandSlug };

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "rating") orderBy = { avgRating: "desc" };

  const [totalCount, products, categories, skinTypes, skinConcerns, brands] =
    await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variants: { where: { isActive: true }, orderBy: { price: "asc" } },
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

  let filtered = products;
  if (sort === "price-asc") filtered = [...products].sort((a, b) => (a.variants[0]?.price ?? 0) - (b.variants[0]?.price ?? 0));
  if (sort === "price-desc") filtered = [...products].sort((a, b) => (b.variants[0]?.price ?? 0) - (a.variants[0]?.price ?? 0));

  const totalPages = Math.ceil(totalCount / pageSize);

  const items: IndexItem[] = filtered.map((product, i) => {
    const v = product.variants[0];
    return {
      slug: product.slug,
      index: String(i + 1 + (page - 1) * pageSize).padStart(2, "0"),
      name: product.name,
      note: `${product.category?.name ?? "Skincare"}${v ? `, ${v.name}` : ""}`,
      price: v ? formatRupiah(v.price) : "—",
      img: product.images[0] ? imageUrl(product.images[0].key) : null,
    };
  });

  const rowLink = (active: boolean, href: string, label: string, count?: number) => (
    <Link
      key={label}
      href={href}
      className={`flex items-baseline justify-between gap-3 py-2 border-b border-[#070707]/15 last:border-b-0 text-[15px] ${
        active ? "font-semibold" : "hover:italic"
      }`}
    >
      <span>{label}</span>
      {count !== undefined && <span className="italic text-xs text-[#070707]/50">{count}</span>}
    </Link>
  );

  return (
    <div className="bg-[#F7F7F4] text-[#070707]">
      {/* Header — editorial, no banner card */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-24 pb-10">
        <p className="furniture text-[#070707]/50 mb-4">
          <Link href="/" className="hover:italic">Beranda</Link>
          <span className="mx-2">/</span>
          <span className="text-[#070707]">Katalog</span>
        </p>
        <h1 className="display-tight text-5xl sm:text-7xl font-medium">
          Katalog <em className="italic font-normal">lengkap.</em>
        </h1>
        <p className="italic text-[#070707]/60 mt-4 max-w-xl">
          {totalCount} produk — batch kecil, BPOM RI, tanpa pewangi tambahan.
        </p>
        <form method="GET" action="/products" className="mt-8 max-w-xl flex items-center gap-0 border border-[#070707]">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Cari serum, toner, sunscreen…"
            className="flex-1 bg-transparent px-4 py-3 text-[15px] italic placeholder:text-[#070707]/35 focus:outline-none"
          />
          <button type="submit" className="furniture bg-[#070707] text-white px-6 py-3.5 hover:bg-[#EF6F79] transition-colors">
            Cari
          </button>
        </form>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-20 grid lg:grid-cols-[240px_1fr] gap-10 items-start">
        {/* Filter — ruled text rows */}
        <aside className="lg:sticky lg:top-20 space-y-8">
          <div>
            <p className="furniture text-[#070707]/50 mb-2">Kategori</p>
            <div className="border-t border-[#070707]">
              {rowLink(!categorySlug, buildUrl(params, { category: "", page: "1" }), "Semua")}
              {categories.map((c) => rowLink(categorySlug === c.slug, buildUrl(params, { category: c.slug, page: "1" }), c.name))}
            </div>
          </div>
          <div>
            <p className="furniture text-[#070707]/50 mb-2">Jenis kulit</p>
            <div className="border-t border-[#070707]">
              {rowLink(!skinTypeSlug, buildUrl(params, { skinType: "", page: "1" }), "Semua")}
              {skinTypes.map((s) => rowLink(skinTypeSlug === s.slug, buildUrl(params, { skinType: s.slug, page: "1" }), s.name))}
            </div>
          </div>
          <div>
            <p className="furniture text-[#070707]/50 mb-2">Masalah kulit</p>
            <div className="border-t border-[#070707]">
              {rowLink(!skinConcernSlug, buildUrl(params, { skinConcern: "", page: "1" }), "Semua")}
              {skinConcerns.map((s) => rowLink(skinConcernSlug === s.slug, buildUrl(params, { skinConcern: s.slug, page: "1" }), s.name))}
            </div>
          </div>
          {brands.length > 0 && (
            <div>
              <p className="furniture text-[#070707]/50 mb-2">Brand</p>
              <div className="border-t border-[#070707]">
                {rowLink(!brandSlug, buildUrl(params, { brand: "", page: "1" }), "Semua")}
                {brands.map((b) => rowLink(brandSlug === b.slug, buildUrl(params, { brand: b.slug, page: "1" }), b.name))}
              </div>
            </div>
          )}
        </aside>

        {/* List */}
        <div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 furniture pb-4 border-b border-[#070707]">
            <span className="text-[#070707]/50">Urutkan —</span>
            {[
              ["Terbaru", "newest"],
              ["Rating", "rating"],
              ["Termurah", "price-asc"],
              ["Termahal", "price-desc"],
            ].map(([label, value]) => (
              <Link
                key={value}
                href={buildUrl(params, { sort: value, page: "1" })}
                className={sort === value ? "text-[#EF6F79]" : "hover:italic"}
              >
                {label}
              </Link>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center border-b border-[#070707]">
              <p className="italic text-xl text-[#070707]/60">Tidak ada produk yang cocok. Coba kata lain.</p>
              <Link href="/products" className="furniture underline underline-offset-4 mt-4 inline-block">Reset filter</Link>
            </div>
          ) : (
            <ProductIndexList items={items} />
          )}

          {totalPages > 1 && (
            <div className="flex items-center gap-6 pt-8 furniture">
              {page > 1 && <Link href={buildUrl(params, { page: (page - 1).toString() })} className="underline underline-offset-4">← Sebelumnya</Link>}
              <span className="text-[#070707]/50">{page} / {totalPages}</span>
              {page < totalPages && <Link href={buildUrl(params, { page: (page + 1).toString() })} className="underline underline-offset-4">Berikutnya →</Link>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
