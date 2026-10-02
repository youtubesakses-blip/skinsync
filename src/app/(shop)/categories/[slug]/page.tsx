// src/app/(shop)/categories/[slug]/page.tsx
// Halaman kategori produk

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { imageUrl } from "@/lib/image-url";
import { formatRupiah } from "@/lib/money";
import Link from "next/link";
import Image from "next/image";
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
    description: `Beli produk kategori ${category.name} terpercaya di SkinSync.`,
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

  if (!category) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb & Title */}
      <div>
        <div className="text-sm text-gray-500 mb-2">
          <Link href="/" className="hover:text-indigo-600">Beranda</Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:text-indigo-600">Kategori</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{category.name}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">{category.name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          Ditemukan {category.products.length} produk dalam kategori ini
        </p>
      </div>

      {category.products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8">
          <p className="text-gray-400">Belum ada produk dalam kategori ini.</p>
          <Link href="/products" className="mt-4 inline-block text-indigo-600 text-sm font-semibold hover:underline">
            Lihat semua produk →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {category.products.map((product) => {
            const firstVariant = product.variants[0];
            const firstImage = product.images[0];

            return (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
              >
                <div className="relative aspect-square bg-gray-50">
                  {firstImage && (
                    <Image
                      src={imageUrl(firstImage.key)}
                      alt={firstImage.altText || product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      unoptimized
                    />
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-indigo-600 transition">
                    {product.name}
                  </h3>
                  {firstVariant && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-bold text-gray-900">
                        {formatRupiah(firstVariant.price)}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
