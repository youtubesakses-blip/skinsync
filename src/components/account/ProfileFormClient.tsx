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

const inputCls =
  "w-full bg-transparent border border-[#070707] px-4 py-3 text-[15px] focus:outline-none focus:bg-white placeholder:text-[#070707]/35 placeholder:italic";
const labelCls = "furniture text-[#070707]/55 block mb-2";

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
        setMessage({ text: "Profil berhasil diperbarui.", type: "success" });
        router.refresh();
      }
    } catch {
      setMessage({ text: "Terjadi kesalahan jaringan", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {message && (
        <p
          className={`border px-4 py-3 text-sm italic ${
            message.type === "success"
              ? "border-[#070707] text-[#070707]"
              : "border-[#EF6F79] text-[#EF6F79]"
          }`}
        >
          {message.text}
        </p>
      )}

      <div>
        <label className={labelCls}>Nomor WhatsApp — terverifikasi</label>
        <input
          type="text"
          disabled
          value={user.phone}
          className="w-full bg-[#E4E5E0] border border-[#070707]/30 px-4 py-3 text-[15px] text-[#070707]/50 cursor-not-allowed"
        />
        <p className="italic text-sm text-[#070707]/50 mt-1">Terhubung dengan akun WhatsApp Anda.</p>
      </div>

      <div>
        <label className={labelCls} htmlFor="acc-name">Nama lengkap</label>
        <input
          id="acc-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama Anda"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="acc-skin">Jenis kulit</label>
        <select
          id="acc-skin"
          value={skinTypeId}
          onChange={(e) => setSkinTypeId(e.target.value ? Number(e.target.value) : "")}
          className={`${inputCls} appearance-none`}
        >
          <option value="">Pilih jenis kulit (opsional)</option>
          {skinTypes.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name}
            </option>
          ))}
        </select>
        <p className="italic text-sm text-[#070707]/50 mt-1">
          Membantu kami merekomendasikan produk yang paling tepat.
        </p>
      </div>

      <div>
        <label className={labelCls} htmlFor="acc-alg">Riwayat alergi — opsional</label>
        <textarea
          id="acc-alg"
          rows={3}
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="Contoh: alergi fragrance sintetis, alkohol tinggi…"
          className={inputCls}
        />
      </div>

      {/* Satu tombol pink per tampilan */}
      <button
        type="submit"
        disabled={loading}
        className="furniture bg-[#EF6F79] text-[#070707] px-6 py-3.5 hover:bg-[#070707] hover:text-white transition-colors disabled:opacity-40"
      >
        {loading ? "Menyimpan…" : "Simpan perubahan"}
      </button>
    </form>
  );
}
