// src/app/admin/products/page.tsx
// Daftar produk di panel admin

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { imageUrl } from "@/lib/image-url";
import Link from "next/link";
import Image from "next/image";
import ProductRowActions from "@/components/admin/ProductRowActions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Produk & Varian — SkinSync Admin",
};

export default async function AdminProductsPage() {
  await requireAdmin();

  const products = await db.product.findMany({
    where: { deletedAt: null },
    include: {
      category: true,
      brand: true,
      variants: { orderBy: { price: "asc" } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Katalog Produk</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola produk, varian kemasan, deskripsi BPOM, dan stok aktif
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm w-fit"
        >
          + Tambah Produk Baru
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Produk</th>
                <th className="p-4">Kategori & Brand</th>
                <th className="p-4">Varian & Harga</th>
                <th className="p-4">Total Stok</th>
                <th className="p-4">BPOM</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada produk dibuat. Klik &ldquo;Tambah Produk Baru&rdquo; untuk mulai.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const firstImg = p.images[0];
                  const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
                  const minPrice = p.variants[0]?.price ?? 0;
                  const maxPrice = p.variants[p.variants.length - 1]?.price ?? minPrice;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border">
                            {firstImg ? (
                              <Image
                                src={imageUrl(firstImg.key)}
                                alt={p.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                🧴
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block line-clamp-1">{p.name}</span>
                            <span className="text-slate-400 text-[11px]">/{p.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-700 block">{p.category.name}</span>
                        <span className="text-slate-400 text-[11px]">{p.brand.name}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-extrabold text-slate-900">
                          {minPrice === maxPrice
                            ? formatRupiah(minPrice)
                            : `${formatRupiah(minPrice)} - ${formatRupiah(maxPrice)}`}
                        </span>
                        <span className="block text-[11px] text-slate-400">{p.variants.length} varian</span>
                      </td>
                      <td className="p-4">
                        <span className={`font-bold ${totalStock <= 5 ? "text-red-600" : "text-slate-800"}`}>
                          {totalStock} pcs
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-[11px] text-slate-600">{p.bpomNumber}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {p.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2 items-end">
                          <ProductRowActions productId={p.id} productName={p.name} />
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            className="text-slate-400 hover:text-slate-600 font-medium text-[11px]"
                          >
                            Lihat di toko ↗
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
