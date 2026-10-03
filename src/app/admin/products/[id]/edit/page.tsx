// src/app/admin/products/[id]/edit/page.tsx
// Halaman edit produk (data utama)
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import ProductEditFormClient from "@/components/admin/ProductEditFormClient";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Produk — SkinSync Admin",
};

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const productId = parseInt(id, 10);
  if (Number.isNaN(productId)) notFound();

  const [product, categories, brands, skinTypes, skinConcerns] = await Promise.all([
    db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        categoryId: true,
        brandId: true,
        bpomNumber: true,
        description: true,
        ingredients: true,
        howToUse: true,
        isActive: true,
        skinTypes: { select: { id: true } },
        skinConcerns: { select: { id: true } },
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            comparePrice: true,
            weightGram: true,
            stock: true,
            minStock: true,
            isActive: true,
          },
          orderBy: { id: "asc" },
        },
        images: {
          select: { id: true, key: true, altText: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.skinType.findMany({ orderBy: { name: "asc" } }),
    db.skinConcern.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="text-xs text-indigo-600 hover:underline font-semibold block mb-1"
        >
          ← Kembali ke Katalog Produk
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Edit Produk: {product.name}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Perubahan langsung tampil di katalog toko setelah disimpan
        </p>
      </div>

      <ProductEditFormClient
        product={product}
        categories={categories}
        brands={brands}
        skinTypes={skinTypes}
        skinConcerns={skinConcerns}
      />
    </div>
  );
}
