// src/app/(shop)/categories/[slug]/page.tsx
// Halaman kategori — Aurelle ruled rows.

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { imageUrl } from "@/lib/image-url";
import { formatRupiah } from "@/lib/money";
import Link from "next/link";
import type { Metadata } from "next";
import ProductIndexList, { type IndexItem } from "@/components/shop/ProductIndexList";

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
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variants: { where: { isActive: true }, orderBy: { price: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!category) notFound();

  const items: IndexItem[] = category.products.map((product, i) => {
    const v = product.variants[0];
    return {
      slug: product.slug,
      index: String(i + 1).padStart(2, "0"),
      name: product.name,
      note: v ? v.name : "Satu ukuran",
      price: v ? formatRupiah(v.price) : "—",
      img: product.images[0] ? imageUrl(product.images[0].key) : null,
    };
  });

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
          <div className="mt-10">
            <ProductIndexList items={items} />
          </div>
        )}
      </div>
    </div>
  );
}
