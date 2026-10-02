// src/app/admin/orders/[id]/page.tsx
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import AdminOrderStatusManager from "@/components/admin/AdminOrderStatusManager";
import Link from "next/link";
import type { Metadata } from "next";

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AdminOrderDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Detail Pesanan #${id} — SkinSync Admin` };
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  await requireAdmin();
  const { id } = await params;
  const orderId = parseInt(id, 10);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: true,
      shippingZone: true,
      voucher: true,
      payments: { orderBy: { createdAt: "desc" } },
      histories: { orderBy: { createdAt: "asc" } },
      notifications: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <Link href="/admin/orders" className="text-xs text-indigo-600 hover:underline font-semibold block mb-1">
            ← Kembali ke Daftar Pesanan
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            {order.orderNumber}
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {order.status}
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Dibuat pada {new Date(order.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order details & Status updater */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Manager Form */}
          <AdminOrderStatusManager
            orderId={order.id}
            currentStatus={order.status}
            courierName={order.courierName}
            trackingNumber={order.trackingNumber}
            adminNote={order.adminNote}
          />

          {/* Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider">
              Produk yang Dipesan
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {order.items.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{item.productName}</p>
                    <p className="text-slate-500">Varian: {item.variantName} | SKU: {item.sku}</p>
                    <p className="text-slate-400">{formatRupiah(item.price)} x {item.qty} pcs</p>
                  </div>
                  <span className="font-extrabold text-slate-900">{formatRupiah(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp Logs for this order */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              Riwayat Notifikasi WhatsApp (Fonnte)
            </h3>
            {order.notifications.length === 0 ? (
              <p className="text-xs text-slate-400">Belum ada log notifikasi WA untuk pesanan ini.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {order.notifications.map((notif) => (
                  <div key={notif.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        Template: <code className="bg-slate-100 px-1 py-0.5 rounded">{notif.templateKey}</code>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        notif.status === "SENT"
                          ? "bg-emerald-50 text-emerald-700"
                          : notif.status === "FAILED"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {notif.status} (Percobaan: {notif.attempts})
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] whitespace-pre-line bg-slate-50 p-2 rounded-lg">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Tujuan: {notif.recipient} | Waktu: {new Date(notif.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer & Shipping snapshot */}
        <div className="space-y-6">
          {/* Customer & Address Details */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3 text-xs">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b pb-2">
              Penerima & Alamat Pengiriman
            </h3>
            <div>
              <p className="text-slate-400 text-[11px]">Nama Penerima</p>
              <p className="font-bold text-slate-900 text-sm">{order.recipientName}</p>
              <p className="text-slate-600">{order.recipientPhone}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px]">Alamat Lengkap</p>
              <p className="text-slate-800 leading-relaxed font-medium">
                {order.shipAddress}, {order.shipDistrict}, {order.shipCity}, {order.shipProvince} {order.shipPostalCode}
              </p>
            </div>
            {order.customerNote && (
              <div className="p-2.5 bg-amber-50 rounded-lg text-amber-900">
                <span className="font-bold block text-[11px]">Catatan Pembeli:</span>
                {order.customerNote}
              </div>
            )}
          </div>

          {/* Payment & Calculation Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3 text-xs">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b pb-2">
              Rincian Pembayaran
            </h3>
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Produk</span>
              <span className="font-bold text-slate-800">{formatRupiah(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Ongkir ({order.shippingZone.name})</span>
              <span className="font-bold text-slate-800">{formatRupiah(order.shippingCost)}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Diskon ({order.voucher?.code})</span>
                <span>-{formatRupiah(order.discountTotal)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-black text-sm text-slate-900">
              <span>Grand Total</span>
              <span className="text-indigo-600 text-base">{formatRupiah(order.grandTotal)}</span>
            </div>
          </div>

          {/* History Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3 text-xs">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b pb-2">
              Timeline Status
            </h3>
            <div className="space-y-2">
              {order.histories.map((h) => (
                <div key={h.id} className="border-l-2 border-indigo-400 pl-3 py-1 space-y-0.5">
                  <p className="font-bold text-slate-800">{h.toStatus}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(h.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
                  </p>
                  {h.note && <p className="text-[11px] text-slate-600">{h.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
