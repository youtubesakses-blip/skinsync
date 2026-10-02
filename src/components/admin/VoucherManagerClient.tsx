// src/components/admin/VoucherManagerClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/money";

interface Voucher {
  id: number;
  code: string;
  type: string;
  value: number;
  maxDiscount: number | null;
  minPurchase: number;
  quota: number | null;
  usedCount: number;
  perUserLimit: number;
  startsAt: string | Date;
  endsAt: string | Date;
  isActive: boolean;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const defaultStartsAt = new Date().toISOString().slice(0, 10);
const defaultEndsAt = new Date(Date.now() + THIRTY_DAYS_MS).toISOString().slice(0, 10);

const EMPTY_FORM = {
  code: "",
  type: "PERCENT",
  value: 10,
  maxDiscount: 20000,
  minPurchase: 100000,
  quota: 100,
  perUserLimit: 1,
  startsAt: defaultStartsAt,
  endsAt: defaultEndsAt,
};

const toDateInput = (d: string | Date) =>
  new Date(d).toISOString().slice(0, 10);

export default function VoucherManagerClient({ initialVouchers }: { initialVouchers: Voucher[] }) {
  const router = useRouter();
  const [vouchers, setVouchers] = useState(initialVouchers);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError(null);
    setShowForm(true);
  };

  const openEdit = (v: Voucher) => {
    setEditingId(v.id);
    setForm({
      code: v.code,
      type: v.type,
      value: v.value,
      maxDiscount: v.maxDiscount ?? 0,
      minPurchase: v.minPurchase,
      quota: v.quota ?? 0,
      perUserLimit: v.perUserLimit,
      startsAt: toDateInput(v.startsAt),
      endsAt: toDateInput(v.endsAt),
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...(editingId === null ? { code: form.code, type: form.type } : {}),
      value: Number(form.value),
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      minPurchase: Number(form.minPurchase),
      quota: form.quota ? Number(form.quota) : null,
      perUserLimit: Number(form.perUserLimit),
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
    };

    try {
      const res = await fetch(
        editingId === null ? "/api/admin/vouchers" : `/api/admin/vouchers/${editingId}`,
        {
          method: editingId === null ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan voucher");
        return;
      }
      if (editingId === null) {
        setVouchers((prev) => [data.voucher, ...prev]);
      } else {
        setVouchers((prev) =>
          prev.map((v) => (v.id === editingId ? data.voucher : v))
        );
      }
      setShowForm(false);
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (v: Voucher) => {
    try {
      const res = await fetch(`/api/admin/vouchers/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !v.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Gagal mengubah status voucher");
        return;
      }
      setVouchers((prev) =>
        prev.map((x) => (x.id === v.id ? data.voucher : x))
      );
      router.refresh();
    } catch {
      alert("Terjadi kesalahan jaringan");
    }
  };

  const handleDelete = async (v: Voucher) => {
    const ok = window.confirm(
      `Hapus voucher "${v.code}"?\n\nVoucher yang sudah pernah dipakai tidak bisa dihapus (nonaktifkan saja).`
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/vouchers/${v.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Gagal menghapus voucher");
        return;
      }
      setVouchers((prev) => prev.filter((x) => x.id !== v.id));
      router.refresh();
    } catch {
      alert("Terjadi kesalahan jaringan");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => (showForm ? setShowForm(false) : openAdd())}
          className="py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
        >
          {showForm ? "Batal" : "+ Buat Voucher Baru"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 bg-white rounded-2xl border space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">
            {editingId === null
              ? "Form Voucher Diskon Baru"
              : `Edit Voucher ${form.code} (kode & tipe tidak bisa diubah)`}
          </h3>
          {error && (
            <div className="p-3 bg-red-50 text-red-700 font-semibold rounded-lg border border-red-200">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Kode Voucher (Otomatis Kapital)</label>
              <input
                type="text"
                required
                disabled={editingId !== null}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="CONTOH: GLOWING20"
                className="w-full p-2.5 border rounded-lg bg-slate-50 font-mono font-bold disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tipe Voucher</label>
              <select
                value={form.type}
                disabled={editingId !== null}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-slate-50 font-bold disabled:opacity-60"
              >
                <option value="PERCENT">Persentase (%)</option>
                <option value="FIXED">Nominal Tetap (Rp)</option>
                <option value="FREE_SHIPPING">Gratis Ongkir (Flat)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nilai Diskon</label>
              <input
                type="number"
                required
                min={0}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                placeholder={form.type === "PERCENT" ? "Contoh: 15" : "Contoh: 20000"}
                className="w-full p-2.5 border rounded-lg bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Maksimal Diskon (IDR, Opsional)</label>
              <input
                type="number"
                value={form.maxDiscount || ""}
                onChange={(e) => setForm({ ...form, maxDiscount: Number(e.target.value) })}
                placeholder="Khusus tipe persen"
                className="w-full p-2.5 border rounded-lg bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Minimal Pembelian (IDR)</label>
              <input
                type="number"
                required
                min={0}
                value={form.minPurchase}
                onChange={(e) => setForm({ ...form, minPurchase: Number(e.target.value) })}
                className="w-full p-2.5 border rounded-lg bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Total Kuota (Opsional)</label>
              <input
                type="number"
                value={form.quota || ""}
                onChange={(e) => setForm({ ...form, quota: Number(e.target.value) })}
                placeholder="Kosongkan jika unlimited"
                className="w-full p-2.5 border rounded-lg bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Batas Pemakaian Per Akun</label>
              <input
                type="number"
                required
                min={1}
                value={form.perUserLimit}
                onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })}
                className="w-full p-2.5 border rounded-lg bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tanggal Mulai Berlaku</label>
              <input
                type="date"
                required
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tanggal Berakhir</label>
              <input
                type="date"
                required
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-slate-50"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-6 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : editingId === null ? "Publikasikan Voucher" : "💾 Simpan Perubahan"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="p-4">Kode Voucher</th>
                <th className="p-4">Tipe & Nilai</th>
                <th className="p-4">Min Belanja</th>
                <th className="p-4">Terpakai / Kuota</th>
                <th className="p-4">Masa Berlaku</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vouchers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada voucher. Klik “Buat Voucher Baru” untuk mulai.
                  </td>
                </tr>
              )}
              {vouchers.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-black text-indigo-600 text-sm">{v.code}</td>
                  <td className="p-4 text-slate-700">
                    <span className="font-bold">
                      {v.type === "PERCENT"
                        ? `${v.value}% (Maks: ${v.maxDiscount ? formatRupiah(v.maxDiscount) : "Tanpa batas"})`
                        : v.type === "FIXED"
                        ? formatRupiah(v.value)
                        : "Gratis Ongkir"}
                    </span>
                    <span className="block text-[11px] text-slate-400">Limit: {v.perUserLimit}x / user</span>
                  </td>
                  <td className="p-4 font-semibold text-slate-800">{formatRupiah(v.minPurchase)}</td>
                  <td className="p-4">
                    <span className="font-bold text-slate-800">{v.usedCount}</span>
                    <span className="text-slate-400"> / {v.quota || "∞"}</span>
                  </td>
                  <td className="p-4 text-slate-500 text-[11px]">
                    {new Date(v.startsAt).toLocaleDateString("id-ID")} - {new Date(v.endsAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => handleToggle(v)}
                      title="Klik untuk mengaktifkan/menonaktifkan"
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] transition ${
                        v.isActive
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {v.isActive ? "● Aktif" : "○ Nonaktif"}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(v)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold hover:bg-indigo-600 hover:text-white transition"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(v)}
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold hover:bg-red-600 hover:text-white transition"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
