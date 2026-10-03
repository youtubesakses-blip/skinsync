// src/components/admin/ProductEditFormClient.tsx
// Form edit data utama produk (nama, slug, kategori, brand, BPOM, deskripsi, status)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { imageUrl } from "@/lib/image-url";

interface Option {
  id: number;
  name: string;
}

interface InitialImage {
  id: number;
  key: string;
  altText: string | null;
  sortOrder: number;
}

interface InitialVariant {
  id: number;
  sku: string;
  name: string;
  price: number;
  comparePrice: number | null;
  weightGram: number;
  stock: number;
  minStock: number;
  isActive: boolean;
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
  skinTypes: { id: number }[];
  skinConcerns: { id: number }[];
  variants: InitialVariant[];
  images: InitialImage[];
}

interface EditableImage {
  key: string;
  altText: string;
}

const MAX_IMAGES = 8;

export default function ProductEditFormClient({
  product,
  categories,
  brands,
  skinTypes,
  skinConcerns,
}: {
  product: InitialProduct;
  categories: Option[];
  brands: Option[];
  skinTypes: Option[];
  skinConcerns: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({ ...product });
  const [images, setImages] = useState<EditableImage[]>(
    [...(product.images ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => ({ key: img.key, altText: img.altText ?? "" }))
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedSkinTypeIds, setSelectedSkinTypeIds] = useState<number[]>(
    (product.skinTypes ?? []).map((t) => t.id)
  );
  const [selectedConcernIds, setSelectedConcernIds] = useState<number[]>(
    (product.skinConcerns ?? []).map((c) => c.id)
  );
  const [variants, setVariants] = useState<
    Array<{
      id?: number;
      sku: string;
      name: string;
      price: number;
      comparePrice?: number | null;
      stock: number;
      minStock: number;
      weightGram: number;
      isActive: boolean;
    }>
  >(
    (product.variants ?? []).map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      price: v.price,
      comparePrice: v.comparePrice,
      stock: v.stock,
      minStock: v.minStock,
      weightGram: v.weightGram,
      isActive: v.isActive,
    }))
  );

  const set = (key: keyof InitialProduct, value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= MAX_IMAGES) {
      setError(`Maksimal ${MAX_IMAGES} gambar per produk.`);
      e.target.value = "";
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "product");

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mengunggah gambar");
      } else if (data.key) {
        setImages((prev) => [...prev, { key: data.key, altText: "" }]);
        setSuccess(false);
      }
    } catch {
      setError("Kesalahan saat mengunggah file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) =>
    setImages((prev) => prev.filter((_, i) => i !== index));

  const handleMoveImage = (index: number, direction: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleAltChange = (index: number, value: string) =>
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, altText: value } : img))
    );

  const handleAddVariant = () =>
    setVariants((prev) => [
      ...prev,
      {
        sku: "",
        name: "",
        price: 0,
        comparePrice: null,
        stock: 0,
        minStock: 5,
        weightGram: 0,
        isActive: true,
      },
    ]);

  const handleRemoveVariant = (index: number) =>
    setVariants((prev) => prev.filter((_, i) => i !== index));

  const updateVariant = (
    index: number,
    key: "sku" | "name" | "price" | "comparePrice" | "stock" | "minStock" | "weightGram" | "isActive",
    value: string | number | boolean | null
  ) =>
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [key]: value } : v))
    );

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
          skinTypeIds: selectedSkinTypeIds,
          skinConcernIds: selectedConcernIds,
          variants: variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            name: v.name,
            price: Number(v.price),
            comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
            stock: Number(v.stock),
            minStock: Number(v.minStock),
            weightGram: Number(v.weightGram),
            isActive: v.isActive,
          })),
          images: images.map((img) => ({ key: img.key, altText: img.altText })),
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
          Urutan foto menentukan foto utama (foto pertama tampil di katalog).
          Perubahan stok di sini tercatat sebagai penyesuaian manual.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b pb-2">
          Kesesuaian Jenis & Masalah Kulit
        </h2>

        <div>
          <span className="block font-semibold text-slate-700 mb-2">Jenis Kulit:</span>
          <div className="flex flex-wrap gap-2">
            {skinTypes.map((st) => {
              const isSelected = selectedSkinTypeIds.includes(st.id);
              return (
                <button
                  type="button"
                  key={st.id}
                  onClick={() =>
                    setSelectedSkinTypeIds((prev) =>
                      isSelected ? prev.filter((id) => id !== st.id) : [...prev, st.id]
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {st.name}
                </button>
              );
            })}
          </div>
          {skinTypes.length === 0 && (
            <p className="text-[11px] text-slate-400 mt-1">Belum ada data jenis kulit.</p>
          )}
        </div>

        <div>
          <span className="block font-semibold text-slate-700 mb-2">Masalah Kulit:</span>
          <div className="flex flex-wrap gap-2">
            {skinConcerns.map((sc) => {
              const isSelected = selectedConcernIds.includes(sc.id);
              return (
                <button
                  type="button"
                  key={sc.id}
                  onClick={() =>
                    setSelectedConcernIds((prev) =>
                      isSelected ? prev.filter((id) => id !== sc.id) : [...prev, sc.id]
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    isSelected
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {sc.name}
                </button>
              );
            })}
          </div>
          {skinConcerns.length === 0 && (
            <p className="text-[11px] text-slate-400 mt-1">Belum ada data masalah kulit.</p>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-sm font-bold text-slate-900">Varian Produk (Ukuran & Stok)</h2>
          <button
            type="button"
            onClick={handleAddVariant}
            className="text-indigo-600 font-bold hover:underline text-xs"
          >
            + Tambah Varian
          </button>
        </div>

        {variants.length === 0 && (
          <p className="text-[11px] text-slate-400 bg-slate-50 rounded-xl p-3 border">
            Belum ada varian. Klik &quot;Tambah Varian&quot; untuk membuat varian baru.
          </p>
        )}

        <div className="space-y-3">
          {variants.map((v, idx) => (
            <div key={v.id ?? `new-${idx}`} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Varian #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveVariant(idx)}
                  className="text-red-600 hover:underline text-[11px]"
                >
                  Hapus Varian
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Nama Varian</label>
                  <input
                    type="text"
                    required
                    value={v.name}
                    onChange={(e) => updateVariant(idx, "name", e.target.value)}
                    placeholder="Contoh: 30 ml"
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">SKU Unik</label>
                  <input
                    type="text"
                    required
                    value={v.sku}
                    onChange={(e) => updateVariant(idx, "sku", e.target.value.toUpperCase())}
                    placeholder="Contoh: TNR-30ML"
                    className="w-full p-2 border rounded-lg bg-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Harga Jual (IDR)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={v.price}
                    onChange={(e) => updateVariant(idx, "price", Number(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Harga Coret (Opsional)</label>
                  <input
                    type="number"
                    value={v.comparePrice ?? ""}
                    onChange={(e) =>
                      updateVariant(idx, "comparePrice", e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Stok</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={v.stock}
                    onChange={(e) => updateVariant(idx, "stock", Number(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Batas Minimum Stok</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={v.minStock}
                    onChange={(e) => updateVariant(idx, "minStock", Number(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Berat (Gram)</label>
                  <input
                    type="number"
                    min={0}
                    value={v.weightGram}
                    onChange={(e) => updateVariant(idx, "weightGram", Number(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id={`variant-active-${idx}`}
                    checked={v.isActive}
                    onChange={(e) => updateVariant(idx, "isActive", e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <label htmlFor={`variant-active-${idx}`} className="text-[11px] font-semibold text-slate-700">
                    Varian Aktif
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b pb-2">
          Foto / Galeri Produk ({images.length}/{MAX_IMAGES})
        </h2>

        {images.length === 0 && (
          <p className="text-[11px] text-slate-400 bg-slate-50 rounded-xl p-3 border">
            Belum ada foto. Tambahkan minimal 1 foto agar produk tampil
            menarik di katalog.
          </p>
        )}

        <div className="space-y-3">
          {images.map((img, idx) => (
            <div
              key={`${img.key}-${idx}`}
              className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-200"
            >
              <div className="relative w-20 h-20 rounded-lg border bg-white overflow-hidden shrink-0">
                <Image
                  src={imageUrl(img.key)}
                  alt={img.altText || `Foto ${idx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {idx === 0 && (
                  <span className="absolute bottom-1 left-1 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    UTAMA
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">
                    Foto #{idx + 1}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      title="Geser ke kiri (lebih utama)"
                      disabled={idx === 0}
                      onClick={() => handleMoveImage(idx, -1)}
                      className="w-7 h-7 grid place-items-center rounded-lg border bg-white font-bold hover:bg-slate-100 disabled:opacity-30"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      title="Geser ke kanan"
                      disabled={idx === images.length - 1}
                      onClick={() => handleMoveImage(idx, 1)}
                      className="w-7 h-7 grid place-items-center rounded-lg border bg-white font-bold hover:bg-slate-100 disabled:opacity-30"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      title="Hapus foto ini"
                      onClick={() => handleRemoveImage(idx)}
                      className="h-7 px-2.5 grid place-items-center rounded-lg border border-red-200 bg-white text-red-600 font-bold hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={img.altText}
                  onChange={(e) => handleAltChange(idx, e.target.value)}
                  placeholder="Teks alt (cth: Serum Niacinamide tampak depan)"
                  className="w-full p-2 border rounded-lg bg-white"
                />
              </div>
            </div>
          ))}
        </div>

        {images.length < MAX_IMAGES && (
          <label className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-indigo-600 bg-slate-50 transition font-bold text-slate-500">
            {uploading ? "Mengunggah..." : "+ Tambah Foto"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}
        <p className="text-[11px] text-slate-400">
          File otomatis dikompresi ke WebP. Perubahan foto tersimpan saat
          tombol Simpan Perubahan ditekan.
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
          disabled={saving || uploading}
          className="py-3 px-8 rounded-xl bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 transition disabled:opacity-50 shadow-md"
        >
          {uploading ? "Mengunggah foto..." : saving ? "Menyimpan..." : "💾 Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}
