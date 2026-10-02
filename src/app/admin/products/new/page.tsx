// src/app/admin/products/new/page.tsx
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import ProductFormClient from "@/components/admin/ProductFormClient";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tambah Produk Baru — SkinSync Admin",
};

export default async function AdminNewProductPage() {
  await requireAdmin();

  const [categories, brands, skinTypes, skinConcerns] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.skinType.findMany({ orderBy: { name: "asc" } }),
    db.skinConcern.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="text-xs text-indigo-600 hover:underline font-semibold block mb-1">
          ← Kembali ke Katalog Produk
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tambah Produk Baru</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Pastikan nomor BPOM dan komposisi produk diisi dengan benar sesuai registrasi resmi
        </p>
      </div>

      <ProductFormClient
        categories={categories}
        brands={brands}
        skinTypes={skinTypes}
        skinConcerns={skinConcerns}
      />
    </div>
  );
}
