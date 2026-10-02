// src/components/admin/ProductEditFormClient.tsx
// Form edit data utama produk (nama, slug, kategori, brand, BPOM, deskripsi, status)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Option {
  id: number;
  name: string;
}

interface InitialProduct {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  brandId: number;
  bpomNumber: string;
  description: string;
  ingredients: string;
  howToUse: string;
  isActive: boolean;
}

export default function ProductEditFormClient({
  product,
  categories,
  brands,
}: {
  product: InitialProduct;
  categories: Option[];
  brands: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({ ...product });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (key: keyof InitialProduct, value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          categoryId: Number(form.categoryId),
          brandId: Number(form.brandId),
          bpomNumber: form.bpomNumber,
          description: form.description,
          ingredients: form.ingredients,
          howToUse: form.howToUse,
          isActive: form.isActive,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan perubahan");
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-xs max-w-4xl">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200">
          ✅ Perubahan berhasil disimpan.
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b pb-2">
          Informasi Produk Utama
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Produk</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 font-bold"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">URL Slug</label>
            <input
              type="text"
              required
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
            <select
              value={form.categoryId}
              onChange={(e) => set("categoryId", Number(e.target.value))}
              className="w-full p-2.5 border rounded-xl bg-slate-50 font-semibold"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Brand</label>
            <select
              value={form.brandId}
              onChange={(e) => set("brandId", Number(e.target.value))}
              className="w-full p-2.5 border rounded-xl bg-slate-50 font-semibold"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nomor Registrasi BPOM (Wajib)
            </label>
            <input
              type="text"
              required
              value={form.bpomNumber}
              onChange={(e) => set("bpomNumber", e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 font-mono font-bold"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="edit-isActive"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="rounded text-indigo-600"
            />
            <label htmlFor="edit-isActive" className="font-semibold text-slate-800">
              Produk Aktif (Tampil di Katalog Toko)
            </label>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Deskripsi Produk</label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full p-2.5 border rounded-xl bg-slate-50 leading-relaxed"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Cara Penggunaan</label>
          <textarea
            required
            rows={2}
            value={form.howToUse}
            onChange={(e) => set("howToUse", e.target.value)}
            className="w-full p-2.5 border rounded-xl bg-slate-50"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Komposisi Lengkap (Ingredients)
          </label>
          <textarea
            required
            rows={2}
            value={form.ingredients}
            onChange={(e) => set("ingredients", e.target.value)}
            className="w-full p-2.5 border rounded-xl bg-slate-50 font-mono"
          />
        </div>

        <p className="text-[11px] text-slate-400 bg-slate-50 rounded-xl p-3 border">
          💡 Catatan: varian (harga & stok) dikelola lewat menu{" "}
          <span className="font-bold">Stok</span>, sedangkan foto produk tidak diubah di sini.
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="py-3 px-6 rounded-xl border border-slate-300 font-bold hover:bg-slate-50 transition"
        >
          Kembali
        </button>
        <button
          type="submit"
          disabled={saving}
          className="py-3 px-8 rounded-xl bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 transition disabled:opacity-50 shadow-md"
        >
          {saving ? "Menyimpan..." : "💾 Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}
