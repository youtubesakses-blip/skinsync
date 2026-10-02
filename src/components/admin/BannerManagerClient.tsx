// src/components/admin/BannerManagerClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { imageUrl } from "@/lib/image-url";

interface Banner {
  id: number;
  title: string;
  imageKey: string;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export default function BannerManagerClient({ initialBanners }: { initialBanners: Banner[] }) {
  const router = useRouter();
  const [banners, setBanners] = useState(initialBanners);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    imageKey: "",
    linkUrl: "",
    sortOrder: 0,
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ title: "", imageKey: "", linkUrl: "", sortOrder: 0 });
    setError(null);
    setShowForm(true);
  };

  const openEdit = (b: Banner) => {
    setEditingId(b.id);
    setForm({
      title: b.title,
      imageKey: b.imageKey,
      linkUrl: b.linkUrl ?? "",
      sortOrder: b.sortOrder,
    });
    setError(null);
    setShowForm(true);
  };

  const handleUploadBannerImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "banner");

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengunggah banner");
      } else {
        setForm((prev) => ({ ...prev, imageKey: data.key }));
      }
    } catch {
      setError("Kesalahan saat mengunggah file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imageKey) {
      setError("Silakan unggah gambar banner terlebih dahulu");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        editingId === null ? "/api/admin/banners" : `/api/admin/banners/${editingId}`,
        {
          method: editingId === null ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            imageKey: form.imageKey,
            linkUrl: form.linkUrl.trim() || null,
            sortOrder: Number(form.sortOrder),
            ...(editingId === null ? { isActive: true } : {}),
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan banner");
        return;
      }
      if (editingId === null) {
        setBanners((prev) => [...prev, data.banner]);
      } else {
        setBanners((prev) =>
          prev.map((b) => (b.id === editingId ? data.banner : b))
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

  const handleToggle = async (b: Banner) => {
    try {
      const res = await fetch(`/api/admin/banners/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Gagal mengubah status banner");
        return;
      }
      setBanners((prev) => prev.map((x) => (x.id === b.id ? data.banner : x)));
      router.refresh();
    } catch {
      alert("Terjadi kesalahan jaringan");
    }
  };

  const handleDelete = async (b: Banner) => {
    const ok = window.confirm(
      `Hapus banner "${b.title}"?\n\nBanner akan dihapus permanen dari beranda.`
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/banners/${b.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Gagal menghapus banner");
        return;
      }
      setBanners((prev) => prev.filter((x) => x.id !== b.id));
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
          {showForm ? "Batal" : "+ Tambah Banner Beranda"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 bg-white rounded-2xl border space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">
            {editingId === null ? "Form Banner Promo Baru" : `Edit Banner: ${form.title}`}
          </h3>
          {error && <div className="p-3 bg-red-50 text-red-700 font-semibold rounded-lg border border-red-200">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Judul Banner</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: Promo Kulit Sehat Akhir Bulan"
                className="w-full p-2.5 border rounded-lg bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Link Tujuan (Klik Banner)</label>
              <input
                type="text"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="Contoh: /products atau /categories/serum"
                className="w-full p-2.5 border rounded-lg bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Urutan Prioritas Tampil</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="w-full p-2.5 border rounded-lg bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              {editingId === null
                ? "Unggah Gambar Banner (Maks lebar 1600px)"
                : "Ganti Gambar (opsional — biarkan jika tidak diganti)"}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={handleUploadBannerImage}
                className="text-xs"
              />
              {uploading && <span className="text-indigo-600 font-semibold">Mengunggah...</span>}
            </div>
            {form.imageKey && (
              <div className="mt-3 relative h-32 w-64 rounded-xl border overflow-hidden">
                <Image src={imageUrl(form.imageKey)} alt="Preview" fill className="object-cover" unoptimized />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || uploading || !form.imageKey}
            className="py-2.5 px-6 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40"
          >
            {loading ? "Menyimpan..." : editingId === null ? "Publikasikan Banner" : "💾 Simpan Perubahan"}
          </button>
        </form>
      )}

      {/* Grid Banner */}
      {banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed p-10 text-center text-sm text-slate-400">
          Belum ada banner. Klik “Tambah Banner Beranda” untuk mulai.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="relative h-40 bg-slate-100">
                <Image src={imageUrl(b.imageKey)} alt={b.title} fill className="object-cover" unoptimized />
              </div>
              <div className="p-4 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{b.title}</h4>
                  <button
                    type="button"
                    onClick={() => handleToggle(b)}
                    title="Klik untuk mengaktifkan/menonaktifkan"
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 transition ${
                      b.isActive
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {b.isActive ? "● Aktif" : "○ Nonaktif"}
                  </button>
                </div>
                <p className="text-slate-500 truncate">Link: {b.linkUrl || "Tidak ada link"}</p>
                <p className="text-slate-400 text-[11px]">Urutan: {b.sortOrder}</p>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    className="flex-1 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold hover:bg-indigo-600 hover:text-white transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b)}
                    className="flex-1 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold hover:bg-red-600 hover:text-white transition"
                  >
                    🗑️ Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
