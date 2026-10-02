// src/app/admin/stock/page.tsx
// Halaman Manajemen Stok: daftar stok menipis & tabel semua varian dengan riwayat mutasi

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import StockTableClient from "@/components/admin/StockTableClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manajemen & Penyesuaian Stok — SkinSync Admin",
};

export default async function AdminStockPage() {
  await requireAdmin();

  const [variants, recentMovements] = await Promise.all([
    db.productVariant.findMany({
      where: { isActive: true },
      include: { product: true },
      orderBy: { stock: "asc" },
    }),
    db.stockMovement.findMany({
      include: { variant: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const lowStockVariants = variants.filter((v) => v.stock <= v.minStock);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Stok Gudang</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Pantau stok menipis dan catat riwayat penyesuaian stok masuk / keluar secara transparan
        </p>
      </div>

      {/* Warning Box jika ada stok menipis */}
      {lowStockVariants.length > 0 && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h2 className="text-xs font-bold text-amber-900">
              Peringatan: {lowStockVariants.length} varian berada pada atau di bawah batas minimum stok!
            </h2>
            <p className="text-[11px] text-amber-800 mt-0.5">
              {lowStockVariants.map((v) => `${v.product.name} (${v.name}): sisa ${v.stock}`).join(" | ")}
            </p>
          </div>
        </div>
      )}

      {/* Main Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider">
          Inventaris Semua Varian
        </div>
        <StockTableClient variants={variants} />
      </div>

      {/* Stock Movements Log */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
        <h2 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
          10 Mutasi Stok Terakhir (Audit Stock Movement)
        </h2>
        {recentMovements.length === 0 ? (
          <p className="text-xs text-slate-400">Belum ada mutasi stok tercatat.</p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {recentMovements.map((sm) => (
              <div key={sm.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      sm.type === "IN"
                        ? "bg-emerald-50 text-emerald-700"
                        : sm.type === "OUT"
                        ? "bg-red-50 text-red-700"
                        : sm.type === "RESERVE"
                        ? "bg-blue-50 text-blue-700"
                        : sm.type === "RELEASE"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-purple-50 text-purple-700"
                    }`}>
                      {sm.type} ({sm.qty} pcs)
                    </span>
                    <span className="font-bold text-slate-800">
                      {sm.variant.product.name} ({sm.variant.name})
                    </span>
                  </div>
                  {sm.note && <p className="text-slate-500 text-[11px] mt-0.5">{sm.note}</p>}
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  {new Date(sm.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
