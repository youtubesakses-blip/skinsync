// src/components/admin/StockTableClient.tsx
"use client";

import { useState } from "react";
import StockAdjustModal from "./StockAdjustModal";

interface VariantItem {
  id: number;
  sku: string;
  name: string;
  stock: number;
  minStock: number;
  product: {
    name: string;
  };
}

export default function StockTableClient({ variants }: { variants: VariantItem[] }) {
  const [selectedVariant, setSelectedVariant] = useState<VariantItem | null>(null);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-4">SKU</th>
              <th className="p-4">Produk & Varian</th>
              <th className="p-4">Stok Saat Ini</th>
              <th className="p-4">Batas Min</th>
              <th className="p-4">Kondisi</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {variants.map((v) => {
              const isLow = v.stock <= v.minStock;
              return (
                <tr key={v.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-4 font-mono font-bold text-slate-700">{v.sku}</td>
                  <td className="p-4">
                    <span className="font-bold text-slate-900 block">{v.product.name}</span>
                    <span className="text-slate-400">{v.name}</span>
                  </td>
                  <td className="p-4 font-black text-sm">
                    <span className={isLow ? "text-red-600" : "text-slate-900"}>{v.stock} pcs</span>
                  </td>
                  <td className="p-4 text-slate-500">{v.minStock} pcs</td>
                  <td className="p-4">
                    {isLow ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-bold text-[10px]">
                        ⚠️ Stok Menipis
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                        ✓ Aman
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className="py-1 px-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold rounded-lg transition"
                    >
                      Sesuaikan Stok →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedVariant && (
        <StockAdjustModal
          variant={selectedVariant}
          onClose={() => setSelectedVariant(null)}
        />
      )}
    </div>
  );
}
