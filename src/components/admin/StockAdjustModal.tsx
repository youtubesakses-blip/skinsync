// src/components/admin/StockAdjustModal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface StockAdjustModalProps {
  variant: {
    id: number;
    sku: string;
    name: string;
    stock: number;
    product: { name: string };
  };
  onClose: () => void;
}

export default function StockAdjustModal({ variant, onClose }: StockAdjustModalProps) {
  const router = useRouter();
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [qty, setQty] = useState<number>(10);
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: variant.id,
          type,
          qty: Number(qty),
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyesuaikan stok");
      } else {
        router.refresh();
        onClose();
      }
    } catch {
      setError("Kesalahan koneksi jaringan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Penyesuaian Stok</h3>
            <p className="text-[11px] text-slate-500">{variant.product.name} — {variant.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Stok Saat Ini:</label>
            <span className="font-black text-lg text-indigo-600">{variant.stock} pcs</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Jenis Penyesuaian:</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "IN" | "OUT" | "ADJUST")}
              className="w-full p-2.5 border rounded-xl bg-slate-50 font-bold"
            >
              <option value="IN">Stok Masuk (+ Tambah Stok)</option>
              <option value="OUT">Stok Keluar (- Rusak / Terbuang)</option>
              <option value="ADJUST">Atur Ulang (Stock Opname Baru)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {type === "ADJUST" ? "Jumlah Total Stok Baru (pcs):" : "Jumlah Perubahan (pcs):"}
            </label>
            <input
              type="number"
              required
              min={type === "ADJUST" ? 0 : 1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-full p-2.5 border rounded-xl bg-slate-50 font-black text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Catatan / Alasan Penyesuaian:</label>
            <input
              type="text"
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Penerimaan batch baru dari pabrik #PO-102"
              className="w-full p-2.5 border rounded-xl bg-slate-50"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border font-bold hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
