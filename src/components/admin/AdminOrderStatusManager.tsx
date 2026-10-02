// src/components/admin/AdminOrderStatusManager.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdminOrderStatusManagerProps {
  orderId: number;
  currentStatus: string;
  courierName?: string | null;
  trackingNumber?: string | null;
  adminNote?: string | null;
}

export default function AdminOrderStatusManager({
  orderId,
  currentStatus,
  courierName: initialCourier,
  trackingNumber: initialTracking,
  adminNote: initialAdminNote,
}: AdminOrderStatusManagerProps) {
  const router = useRouter();
  const [targetStatus, setTargetStatus] = useState<string>("");
  const [courierName, setCourierName] = useState<string>(initialCourier || "JNE Reguler");
  const [trackingNumber, setTrackingNumber] = useState<string>(initialTracking || "");
  const [note, setNote] = useState<string>("");
  const [adminNote, setAdminNote] = useState<string>(initialAdminNote || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Available next states based on 6.6
  const getNextStatuses = () => {
    switch (currentStatus) {
      case "PENDING_PAYMENT":
        return ["PAID", "CANCELLED"];
      case "PAID":
        return ["PROCESSING", "CANCELLED"];
      case "PROCESSING":
        return ["SHIPPED", "CANCELLED"];
      case "SHIPPED":
        return ["COMPLETED"];
      default:
        return [];
    }
  };

  const nextOptions = getNextStatuses();

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatus) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          note: note.trim() || undefined,
          courierName: targetStatus === "SHIPPED" ? courierName : undefined,
          trackingNumber: targetStatus === "SHIPPED" ? trackingNumber : undefined,
          adminNote: adminNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memperbarui status");
      } else {
        setSuccess(`Status berhasil diubah menjadi ${targetStatus}`);
        setTargetStatus("");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  if (nextOptions.length === 0) {
    return (
      <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 border border-slate-200">
        Status saat ini adalah <strong>{currentStatus}</strong> (Status final, tidak ada pembaruan lanjutan).
      </div>
    );
  }

  return (
    <form onSubmit={handleUpdateStatus} className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
      <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Perbarui Status Pesanan</h3>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 font-semibold">{error}</div>}
      {success && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">{success}</div>}

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Pilih Status Baru:</label>
        <select
          value={targetStatus}
          onChange={(e) => setTargetStatus(e.target.value)}
          className="w-full p-2.5 border rounded-xl bg-slate-50 font-bold text-slate-800"
          required
        >
          <option value="">-- Pilih Status Berikutnya --</option>
          {nextOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {targetStatus === "SHIPPED" && (
        <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
          <p className="font-bold text-indigo-950">Informasi Ekspedisi Pengiriman</p>
          <p className="text-[11px] text-indigo-700">
            *Sistem akan otomatis mengirimkan pesan WhatsApp berisi kurir dan nomor resi kepada pelanggan.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Kurir</label>
              <input
                type="text"
                required
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="Contoh: JNE, J&T, SiCepat"
                className="w-full p-2 border rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nomor Resi Pelacakan</label>
              <input
                type="text"
                required
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Nomor resi asli"
                className="w-full p-2 border rounded-lg bg-white font-mono"
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Catatan Perubahan Status (Riwayat):</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Alasan perubahan, misal: Paket telah diserahkan ke drop point JNE"
          className="w-full p-2.5 border rounded-xl bg-slate-50"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Catatan Internal Admin (Hanya terlihat oleh admin):</label>
        <input
          type="text"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Catatan internal gudang / operasional"
          className="w-full p-2.5 border rounded-xl bg-slate-50"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !targetStatus}
        className="py-2.5 px-6 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-40"
      >
        {loading ? "Menyimpan..." : "Perbarui Status Sekarang"}
      </button>
    </form>
  );
}
