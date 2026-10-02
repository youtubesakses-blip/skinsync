// src/components/admin/ProductRowActions.tsx
// Tombol Edit & Hapus per baris produk (client component)
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProductRowActions({
  productId,
  productName,
}: {
  productId: number;
  productName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const ok = window.confirm(
      `Hapus produk "${productName}"?\n\nProduk akan dinonaktifkan (soft delete) dan tidak tampil di katalog. Stok & riwayat pesanan tetap aman.`
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Gagal menghapus produk");
        return;
      }
      router.refresh();
    } catch {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/admin/products/${productId}/edit`}
        className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold hover:bg-indigo-600 hover:text-white transition"
      >
        ✏️ Edit
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold hover:bg-red-600 hover:text-white transition disabled:opacity-50"
      >
        {deleting ? "Menghapus..." : "🗑️ Hapus"}
      </button>
    </div>
  );
}
