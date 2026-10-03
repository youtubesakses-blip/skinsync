// src/app/(shop)/categories/[slug]/page.tsx
// Halaman kategori — Aurelle ruled rows.

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import Link from "next/link";
import type { Metadata } from "next";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) return { title: "Kategori Tidak Ditemukan — SkinSync" };
  return {
    title: `${category.name} — SkinSync`,
    description: `Produk kategori ${category.name}, batch kecil, BPOM RI.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  const category = await db.category.findUnique({
    where: { slug, isActive: true },
    include: {
      products: {
        where: { isActive: true, deletedAt: null },
        include: {
          variants: { where: { isActive: true }, orderBy: { price: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!category) notFound();

  return (
    <div className="bg-[#F7F7F4] text-[#070707]">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-24 pb-20">
        <p className="furniture text-[#070707]/50 mb-4">
          <Link href="/" className="hover:italic">Beranda</Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:italic">Katalog</Link>
          <span className="mx-2">/</span>
          <span className="text-[#070707]">{category.name}</span>
        </p>
        <h1 className="display-tight text-5xl sm:text-7xl font-medium">{category.name}</h1>
        <p className="italic text-[#070707]/60 mt-4">{category.products.length} produk dalam kategori ini.</p>

        {category.products.length === 0 ? (
          <div className="py-20 text-center border-y border-[#070707] mt-10">
            <p className="italic text-xl text-[#070707]/60">Belum ada produk dalam kategori ini.</p>
            <Link href="/products" className="furniture underline underline-offset-4 mt-4 inline-block">Lihat semua produk</Link>
          </div>
        ) : (
          <div className="mt-10 border-t border-[#070707]">
            {category.products.map((product, i) => {
              const v = product.variants[0];
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-baseline gap-x-5 py-5 border-b border-[#070707]"
                >
                  <span className="furniture text-[#EF6F79]">0{i + 1}</span>
                  <span>
                    <span className="block text-xl sm:text-2xl font-medium group-hover:italic transition-all">{product.name}</span>
                    <span className="block italic text-sm text-[#070707]/55 mt-0.5">
                      {v ? v.name : "Satu ukuran"} · {product.avgRating.toFixed(1)} ({product.reviewCount})
                    </span>
                  </span>
                  <span className="text-lg font-semibold text-[#EF6F79] whitespace-nowrap">
                    {v ? formatRupiah(v.price) : "—"}
                  </span>
                  <span className="hidden sm:inline furniture underline underline-offset-4">Lihat</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
