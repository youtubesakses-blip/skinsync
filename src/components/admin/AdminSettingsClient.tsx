// src/components/admin/AdminSettingsClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdminSettingsClientProps {
  initialTemplates: Record<string, string>;
  initialExpiryHours: number;
  failedLogs: Array<{
    id: number;
    recipient: string;
    templateKey: string;
    message: string;
    attempts: number;
    createdAt: Date;
  }>;
}

export default function AdminSettingsClient({
  initialTemplates,
  initialExpiryHours,
  failedLogs,
}: AdminSettingsClientProps) {
  const router = useRouter();
  const [expiryHours, setExpiryHours] = useState(initialExpiryHours);
  const [templates, setTemplates] = useState(initialTemplates);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [retryingId, setRetryingId] = useState<number | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const payload = [
      { key: "order_expiry_hours", value: Number(expiryHours) },
      ...Object.entries(templates).map(([key, val]) => ({
        key: `wa_template:${key}`,
        value: val,
      })),
    ];

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });

      if (!res.ok) {
        setMessage({ text: "Gagal menyimpan pengaturan", type: "error" });
      } else {
        setMessage({ text: "Pengaturan & template WhatsApp berhasil disimpan!", type: "success" });
        router.refresh();
      }
    } catch {
      setMessage({ text: "Terjadi kesalahan jaringan", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryNotification = async (logId: number) => {
    setRetryingId(logId);
    try {
      const res = await fetch(`/api/admin/notifications/${logId}/retry`, {
        method: "POST",
      });

      if (res.ok) {
        alert("Pesan WhatsApp berhasil dikirim ulang!");
        router.refresh();
      } else {
        alert("Gagal mengirim ulang pesan. Cek kuota atau koneksi Fonnte.");
      }
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-bold ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Form Pengaturan Umum & Template WA */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Toko & Batas Bayar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
          <h2 className="text-sm font-bold text-slate-900 border-b pb-2">Pengaturan Umum Toko</h2>
          <div className="max-w-xs">
            <label className="block font-semibold text-slate-700 mb-1">Masa Berlaku Pembayaran (Jam)</label>
            <input
              type="number"
              required
              min={1}
              max={168}
              value={expiryHours}
              onChange={(e) => setExpiryHours(Number(e.target.value))}
              className="w-full p-2.5 border rounded-xl bg-slate-50 font-bold"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Batas waktu sebelum pesanan berstatus PENDING_PAYMENT otomatis kedaluwarsa.
            </p>
          </div>
        </div>

        {/* Template WhatsApp Fonnte */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
          <h2 className="text-sm font-bold text-slate-900 border-b pb-2">
            Template Pesan Transaksional WhatsApp (Fonnte)
          </h2>
          <p className="text-[11px] text-slate-500">
            Variabel yang didukung: <code>{"{{otp}}"}</code>, <code>{"{{name}}"}</code>, <code>{"{{orderNumber}}"}</code>, <code>{"{{total}}"}</code>, <code>{"{{paymentUrl}}"}</code>, <code>{"{{courier}}"}</code>, <code>{"{{trackingNumber}}"}</code>, <code>{"{{expiresAt}}"}</code>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(templates).map(([key, val]) => (
              <div key={key} className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Template: {key}
                </label>
                <textarea
                  rows={4}
                  value={val}
                  onChange={(e) =>
                    setTemplates((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="w-full p-3 border rounded-xl bg-slate-50 font-mono text-xs leading-relaxed"
                />
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-6 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-40"
            >
              {loading ? "Menyimpan..." : "Simpan Semua Pengaturan"}
            </button>
          </div>
        </div>
      </form>

      {/* Monitoring & Retry WhatsApp Gagal */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900 border-b pb-2">
          Log Pesan WhatsApp Gagal (Status FAILED)
        </h2>
        {failedLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            Semua notifikasi WhatsApp terkirim dengan lancar. Tidak ada pesan yang gagal.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {failedLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-800">{log.recipient}</span>
                  <span className="text-slate-400 ml-2">({log.templateKey})</span>
                  <p className="text-[11px] text-slate-600 line-clamp-1">{log.message}</p>
                  <span className="text-[10px] text-red-600">Percobaan gagal: {log.attempts}x</span>
                </div>
                <button
                  type="button"
                  disabled={retryingId === log.id}
                  onClick={() => handleRetryNotification(log.id)}
                  className="py-1.5 px-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-40 w-fit"
                >
                  {retryingId === log.id ? "Mengirim..." : "Kirim Ulang Sekarang"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
