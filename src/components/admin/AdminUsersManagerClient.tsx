// src/components/admin/AdminUsersManagerClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdminUser {
  id: number;
  name: string;
  phone: string;
  role: string;
  status: string;
  createdAt: Date;
}

export default function AdminUsersManagerClient({
  initialAdmins,
  currentUserId,
}: {
  initialAdmins: AdminUser[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [admins, setAdmins] = useState(initialAdmins);
  const [showAdd, setShowAdd] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat admin");
      } else {
        setAdmins((prev) => [data.user, ...prev]);
        setShowAdd(false);
        setNewAdmin({ name: "", phone: "" });
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    const nextStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    if (!confirm(`Ubah status akun ${user.name} menjadi ${nextStatus}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        setAdmins((prev) =>
          prev.map((a) => (a.id === user.id ? { ...a, status: nextStatus } : a))
        );
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Hapus akun admin ${user.name} (${user.phone}) secara permanen?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAdmins((prev) => prev.filter((a) => a.id !== user.id));
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
        >
          {showAdd ? "Batal" : "+ Tambah Akun Admin"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddAdmin} className="p-5 bg-white rounded-2xl border space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">Form Tambah Admin Baru</h3>
          {error && <div className="p-3 bg-red-50 text-red-700 font-semibold rounded-lg">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Admin</label>
              <input
                type="text"
                required
                value={newAdmin.name}
                onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                placeholder="Contoh: Admin Operasional"
                className="w-full p-2.5 border rounded-lg bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nomor WhatsApp (Untuk Login OTP)</label>
              <input
                type="tel"
                required
                value={newAdmin.phone}
                onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
                className="w-full p-2.5 border rounded-lg bg-slate-50 font-mono"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            *Admin baru akan login menggunakan nomor WhatsApp ini melalui verifikasi OTP.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-6 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700"
          >
            {loading ? "Menyimpan..." : "Simpan Admin"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b">
            <tr>
              <th className="p-4">Nama</th>
              <th className="p-4">Nomor WhatsApp</th>
              <th className="p-4">Peran (Role)</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">
                    {u.name} {isSelf && <span className="text-indigo-600 text-[10px]">(Anda)</span>}
                  </td>
                  <td className="p-4 font-mono text-slate-700">{u.phone}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {!isSelf && u.role !== "SUPER_ADMIN" && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                        >
                          {u.status === "ACTIVE" ? "Blokir" : "Buka Blokir"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          className="text-[11px] font-semibold text-red-600 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
