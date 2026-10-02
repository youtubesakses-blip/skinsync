// src/components/admin/ProductFormClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { imageUrl } from "@/lib/image-url";

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

interface TagItem {
  id: number;
  name: string;
}

interface ProductFormClientProps {
  categories: Category[];
  brands: Brand[];
  skinTypes: TagItem[];
  skinConcerns: TagItem[];
}

export default function ProductFormClient({
  categories,
  brands,
  skinTypes,
  skinConcerns,
}: ProductFormClientProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 1);
  const [brandId, setBrandId] = useState(brands[0]?.id || 1);
  const [bpomNumber, setBpomNumber] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [howToUse, setHowToUse] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Multi-select tags
  const [selectedSkinTypeIds, setSelectedSkinTypeIds] = useState<number[]>([]);
  const [selectedConcernIds, setSelectedConcernIds] = useState<number[]>([]);

  // Variants list
  const [variants, setVariants] = useState<
    Array<{
      sku: string;
      name: string;
      price: number;
      comparePrice?: number;
      stock: number;
      minStock: number;
      weightGram: number;
    }>
  >([
    {
      sku: "",
      name: "Default (30 ml)",
      price: 99000,
      comparePrice: 129000,
      stock: 50,
      minStock: 5,
      weightGram: 100,
    },
  ]);

  // Images keys from upload
  const [imageKeys, setImageKeys] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto generate slug from name
  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(generatedSlug);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imageKeys.length >= 8) {
      alert("Maksimal 8 gambar per produk sesuai spesifikasi.");
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

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengunggah gambar");
      } else {
        setImageKeys((prev) => [...prev, data.key]);
      }
    } catch {
      setError("Kesalahan saat mengunggah file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageKeys((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        sku: "",
        name: "",
        price: 0,
        stock: 10,
        minStock: 5,
        weightGram: 100,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          categoryId: Number(categoryId),
          brandId: Number(brandId),
          bpomNumber,
          description,
          ingredients,
          howToUse,
          isActive,
          skinTypeIds: selectedSkinTypeIds,
          skinConcernIds: selectedConcernIds,
          variants,
          imageKeys,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan produk baru");
      } else {
        router.push("/admin/products");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-xs max-w-4xl">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Informasi Umum */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b pb-2">Informasi Produk Utama</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Produk</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Contoh: Gentle Hydrating Toner"
              className="w-full p-2.5 border rounded-xl bg-slate-50 font-bold"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">URL Slug</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="gentle-hydrating-toner"
              className="w-full p-2.5 border rounded-xl bg-slate-50 font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
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
              value={brandId}
              onChange={(e) => setBrandId(Number(e.target.value))}
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
            <label className="block font-semibold text-slate-700 mb-1">Nomor Registrasi BPOM (Wajib)</label>
            <input
              type="text"
              required
              value={bpomNumber}
              onChange={(e) => setBpomNumber(e.target.value)}
              placeholder="Contoh: NA18231204561"
              className="w-full p-2.5 border rounded-xl bg-slate-50 font-mono font-bold"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <label htmlFor="isActive" className="font-semibold text-slate-800">
              Produk Aktif (Tampil di Katalog Toko)
            </label>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Deskripsi Produk</label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan manfaat, kandungan kunci, dan keunggulan produk..."
            className="w-full p-2.5 border rounded-xl bg-slate-50 leading-relaxed"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Cara Penggunaan</label>
          <textarea
            required
            rows={2}
            value={howToUse}
            onChange={(e) => setHowToUse(e.target.value)}
            placeholder="Langkah pemakaian produk pada pagi / malam hari..."
            className="w-full p-2.5 border rounded-xl bg-slate-50"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Komposisi Lengkap (Ingredients)</label>
          <textarea
            required
            rows={2}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="Aqua, Glycerin, Niacinamide..."
            className="w-full p-2.5 border rounded-xl bg-slate-50 font-mono"
          />
        </div>
      </div>

      {/* Upload Gambar Produk */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b pb-2">Foto / Galeri Produk (Maks 8 gambar)</h2>

        <div className="flex flex-wrap gap-3 items-center">
          {imageKeys.map((k, idx) => (
            <div key={k} className="relative w-24 h-24 rounded-xl border bg-slate-50 overflow-hidden group">
              <Image src={imageUrl(k)} alt={`Preview ${idx}`} fill className="object-cover" unoptimized />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] opacity-80 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}

          {imageKeys.length < 8 && (
            <label className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-600 bg-slate-50 transition">
              <span className="text-lg text-slate-400">+</span>
              <span className="text-[10px] text-slate-500 font-semibold">{uploading ? "Upload..." : "Pilih File"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
        <p className="text-[11px] text-slate-400">
          File akan otomatis dikompresi ke WebP dan disimpan aman di Supabase Storage.
        </p>
      </div>

      {/* Relasi Kulit */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b pb-2">Kesesuaian Jenis & Masalah Kulit</h2>

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
                    isSelected ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {st.name}
                </button>
              );
            })}
          </div>
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
                    isSelected ? "bg-amber-600 text-white border-amber-600" : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {sc.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Varian Produk */}
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

        <div className="space-y-3">
          {variants.map((v, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Varian #{idx + 1}</span>
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(idx)}
                    className="text-red-600 hover:underline text-[11px]"
                  >
                    Hapus Varian
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Nama Varian</label>
                  <input
                    type="text"
                    required
                    value={v.name}
                    onChange={(e) => {
                      const updated = [...variants];
                      updated[idx].name = e.target.value;
                      setVariants(updated);
                    }}
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
                    onChange={(e) => {
                      const updated = [...variants];
                      updated[idx].sku = e.target.value.toUpperCase();
                      setVariants(updated);
                    }}
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
                    onChange={(e) => {
                      const updated = [...variants];
                      updated[idx].price = Number(e.target.value);
                      setVariants(updated);
                    }}
                    className="w-full p-2 border rounded-lg bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Harga Coret (Opsional)</label>
                  <input
                    type="number"
                    value={v.comparePrice || ""}
                    onChange={(e) => {
                      const updated = [...variants];
                      updated[idx].comparePrice = e.target.value ? Number(e.target.value) : undefined;
                      setVariants(updated);
                    }}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={v.stock}
                    onChange={(e) => {
                      const updated = [...variants];
                      updated[idx].stock = Number(e.target.value);
                      setVariants(updated);
                    }}
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
                    onChange={(e) => {
                      const updated = [...variants];
                      updated[idx].minStock = Number(e.target.value);
                      setVariants(updated);
                    }}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Berat (Gram)</label>
                  <input
                    type="number"
                    min={0}
                    value={v.weightGram}
                    onChange={(e) => {
                      const updated = [...variants];
                      updated[idx].weightGram = Number(e.target.value);
                      setVariants(updated);
                    }}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="py-3 px-6 rounded-xl border border-slate-300 font-bold hover:bg-slate-50 transition"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="py-3 px-8 rounded-xl bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 transition disabled:opacity-50 shadow-md"
        >
          {submitting ? "Menyimpan Produk..." : "Simpan & Publikasikan Produk"}
        </button>
      </div>
    </form>
  );
}
