// src/components/account/ProfileFormClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SkinType {
  id: number;
  name: string;
}

interface ProfileFormClientProps {
  user: {
    name: string;
    phone: string;
    skinTypeId: number | null;
    allergies: string | null;
  };
  skinTypes: SkinType[];
}

export default function ProfileFormClient({ user, skinTypes }: ProfileFormClientProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [skinTypeId, setSkinTypeId] = useState<number | "">(user.skinTypeId || "");
  const [allergies, setAllergies] = useState(user.allergies || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          skinTypeId: skinTypeId === "" ? null : Number(skinTypeId),
          allergies: allergies.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Gagal memperbarui profil", type: "error" });
      } else {
        setMessage({ text: "Profil berhasil diperbarui!", type: "success" });
        router.refresh();
      }
    } catch {
      setMessage({ text: "Terjadi kesalahan jaringan", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Nomor WhatsApp (Terverifikasi)</label>
        <input
          type="text"
          disabled
          value={user.phone}
          className="w-full text-xs p-3 border rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
        />
        <p className="text-[11px] text-gray-400 mt-1">Nomor telepon terhubung dengan akun WhatsApp Anda.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama Anda"
          className="w-full text-xs p-3 border rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Jenis Kulit Anda</label>
        <select
          value={skinTypeId}
          onChange={(e) => setSkinTypeId(e.target.value ? Number(e.target.value) : "")}
          className="w-full text-xs p-3 border rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
        >
          <option value="">Pilih Jenis Kulit (Opsional)</option>
          {skinTypes.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-gray-400 mt-1">
          Membantu kami merekomendasikan produk skincare yang paling tepat untuk Anda.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Riwayat Alergi / Sensitivitas Bahan (Opsional)</label>
        <textarea
          rows={3}
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="Contoh: Alergi fragrance sintetis, alkohol tinggi, dsb."
          className="w-full text-xs p-3 border rounded-xl bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="py-3 px-6 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-40 shadow-sm"
      >
        {loading ? "Menyimpan..." : "Simpan Perubahan"}
      </button>
    </form>
  );
}
