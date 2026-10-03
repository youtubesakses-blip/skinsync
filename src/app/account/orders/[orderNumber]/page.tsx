// src/app/account/orders/[orderNumber]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { getMidtransSnapScriptUrl } from "@/lib/midtrans";
import OrderDetailClient from "@/components/account/OrderDetailClient";
import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";

interface OrderDetailPageProps {
  params: Promise<{ orderNumber: string }>;
}

export async function generateMetadata({ params }: OrderDetailPageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Pesanan ${orderNumber} — SkinSync` };
}

export default async function CustomerOrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderNumber } = await params;
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=/account/orders/${orderNumber}`);
  }

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      items: { include: { review: true } },
      shippingZone: true,
      voucher: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      histories: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order || order.userId !== session.userId) {
    notFound();
  }

  const latestPayment = order.payments[0];
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
      <Script
        src={getMidtransSnapScriptUrl(isProduction)}
        data-client-key={process.env.MIDTRANS_CLIENT_KEY ?? ""}
        strategy="lazyOnload"
      />
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
        <div>
          <Link href="/account/orders" className="text-xs text-indigo-600 hover:underline font-semibold block mb-1">
            ← Kembali ke Pesanan Saya
          </Link>
          <h1 className="text-xl font-extrabold text-gray-900">{order.orderNumber}</h1>
          <p className="text-xs text-gray-400">
            Waktu Pemesanan:{" "}
            {new Date(order.createdAt).toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            WIB
          </p>
        </div>

        <div>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Status: {order.status}
          </span>
        </div>
      </div>

      {/* Interactive Pay / Review Section */}
      <OrderDetailClient
        orderNumber={order.orderNumber}
        orderStatus={order.status}
        snapToken={latestPayment?.snapToken}
        redirectUrl={latestPayment?.redirectUrl}
        items={order.items.map((i) => ({
          id: i.id,
          productName: i.productName,
          variantName: i.variantName,
          hasReview: !!i.review,
        }))}
      />

      {/* Informasi Pengiriman & Resi */}
      {order.status === "SHIPPED" || order.status === "COMPLETED" ? (
        <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs space-y-1">
          <p className="font-bold text-indigo-900">Informasi Ekspedisi & Nomor Resi</p>
          <p className="text-indigo-800">
            Kurir: <span className="font-semibold">{order.courierName || "Kurir Resmi"}</span>
          </p>
          <p className="text-indigo-800">
            Nomor Resi: <span className="font-mono font-bold text-sm text-indigo-950">{order.trackingNumber || "-"}</span>
          </p>
        </div>
      ) : null}

      {/* Item Pesanan */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Rincian Produk</h2>
        <div className="divide-y divide-gray-100 border rounded-xl overflow-hidden">
          {order.items.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between text-xs bg-white">
              <div>
                <p className="font-bold text-gray-900">{item.productName}</p>
                <p className="text-gray-500">Varian: {item.variantName} (SKU: {item.sku})</p>
                <p className="text-gray-500">{formatRupiah(item.price)} x {item.qty} pcs</p>
              </div>
              <span className="font-extrabold text-gray-900">{formatRupiah(item.subtotal)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alamat Pengiriman Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-4 bg-gray-50 rounded-xl border space-y-1">
          <p className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Tujuan Pengiriman</p>
          <p className="font-semibold text-gray-900">{order.recipientName} ({order.recipientPhone})</p>
          <p className="text-gray-600 leading-relaxed">
            {order.shipAddress}, {order.shipDistrict}, {order.shipCity}, {order.shipProvince} {order.shipPostalCode}
          </p>
          {order.customerNote && (
            <p className="text-amber-700 pt-1">Catatan: &ldquo;{order.customerNote}&rdquo;</p>
          )}
        </div>

        {/* Ringkasan Pembayaran */}
        <div className="p-4 bg-gray-50 rounded-xl border space-y-2">
          <p className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Rincian Pembayaran</p>
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatRupiah(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Ongkir ({order.shippingZone.name})</span>
            <span>{formatRupiah(order.shippingCost)}</span>
          </div>
          {order.discountTotal > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Diskon Voucher</span>
              <span>-{formatRupiah(order.discountTotal)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-extrabold text-sm text-gray-900">
            <span>Grand Total</span>
            <span className="text-indigo-600 text-base">{formatRupiah(order.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Riwayat Status */}
      <div className="space-y-2 pt-2 border-t text-xs">
        <h3 className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">Riwayat Status Pesanan</h3>
        <div className="space-y-2">
          {order.histories.map((h) => (
            <div key={h.id} className="flex items-center gap-3 text-gray-500">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span className="font-semibold text-gray-700">{h.toStatus}</span>
              <span className="text-[11px]">
                {new Date(h.createdAt).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {h.note && <span className="text-gray-400">— {h.note}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
