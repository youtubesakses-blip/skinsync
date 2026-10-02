// src/components/admin/ShippingZonesManagerClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/money";

interface Zone {
  id: number;
  name: string;
  province: string;
  city: string | null;
  cost: number;
  estimatedDays: string | null;
  isActive: boolean;
}

const EMPTY_FORM = {
  name: "",
  province: "",
  city: "",
  cost: 15000,
  estimatedDays: "2-3 Hari Kerja",
};

export default function ShippingZonesManagerClient({ initialZones }: { initialZones: Zone[] }) {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>(initialZones);
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

  const openEdit = (z: Zone) => {
    setEditingId(z.id);
    setForm({
      name: z.name,
      province: z.province,
      city: z.city ?? "",
      cost: z.cost,
      estimatedDays: z.estimatedDays ?? "",
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name: form.name,
      province: form.province,
      city: form.city.trim() || null,
      cost: Number(form.cost),
      estimatedDays: form.estimatedDays.trim() || null,
    };

    try {
      const res = await fetch(
        editingId === null ? "/api/admin/shipping-zones" : `/api/admin/shipping-zones/${editingId}`,
        {
          method: editingId === null ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan zona");
        return;
      }
      if (editingId === null) {
        setZones((prev) => [...prev, data.zone]);
      } else {
        setZones((prev) => prev.map((z) => (z.id === editingId ? data.zone : z)));
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

  const handleToggle = async (z: Zone) => {
    try {
      const res = await fetch(`/api/admin/shipping-zones/${z.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !z.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Gagal mengubah status zona");
        return;
      }
      setZones((prev) => prev.map((x) => (x.id === z.id ? data.zone : x)));
      router.refresh();
    } catch {
      alert("Terjadi kesalahan jaringan");
    }
  };

  const handleDelete = async (z: Zone) => {
    const ok = window.confirm(
      `Hapus zona "${z.name}"?\n\nZona yang sudah dipakai pesanan tidak bisa dihapus (nonaktifkan saja).`
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/shipping-zones/${z.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Gagal menghapus zona");
        return;
      }
      setZones((prev) => prev.filter((x) => x.id !== z.id));
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
          {showForm ? "Batal" : "+ Tambah Zona Ongkir Baru"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 bg-white rounded-2xl border space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">
            {editingId === null ? "Form Zona Pengiriman Flat Baru" : `Edit Zona: ${form.name}`}
          </h3>
          {error && (
            <div className="p-3 bg-red-50 text-red-700 font-semibold rounded-lg border border-red-200">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Zona</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Jawa Tengah (Flat)"
                className="w-full p-2.5 border rounded-lg bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Provinsi (Kecocokan Alamat)</label>
              <input
                type="text"
                required
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                placeholder="Contoh: Jawa Tengah"
                className="w-full p-2.5 border rounded-lg bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Kota Spesifik (Kosongkan jika seluruh provinsi)</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Opsional, misal: Kota Semarang"
                className="w-full p-2.5 border rounded-lg bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tarif Flat (IDR)</label>
              <input
                type="number"
                required
                min={0}
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                className="w-full p-2.5 border rounded-lg bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Estimasi Hari Pengiriman</label>
              <input
                type="text"
                value={form.estimatedDays}
                onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })}
                placeholder="Contoh: 1-2 Hari Kerja"
                className="w-full p-2.5 border rounded-lg bg-slate-50"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-6 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : editingId === null ? "Simpan Zona" : "💾 Simpan Perubahan"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="p-4">Nama Zona</th>
                <th className="p-4">Cakupan Wilayah</th>
                <th className="p-4">Tarif Flat</th>
                <th className="p-4">Estimasi</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {zones.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Belum ada zona ongkir. Klik “Tambah Zona Ongkir Baru” untuk mulai.
                  </td>
                </tr>
              )}
              {zones.map((z) => (
                <tr key={z.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{z.name}</td>
                  <td className="p-4 text-slate-600">
                    {z.province} {z.city ? `(${z.city})` : "(Seluruh Provinsi)"}
                  </td>
                  <td className="p-4 font-extrabold text-indigo-600">{formatRupiah(z.cost)}</td>
                  <td className="p-4 text-slate-500">{z.estimatedDays || "-"}</td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => handleToggle(z)}
                      title="Klik untuk mengaktifkan/menonaktifkan"
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] transition ${
                        z.isActive
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {z.isActive ? "● Aktif" : "○ Nonaktif"}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(z)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold hover:bg-indigo-600 hover:text-white transition"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(z)}
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
