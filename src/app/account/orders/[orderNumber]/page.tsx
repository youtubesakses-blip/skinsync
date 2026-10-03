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
    <section>
      <Script
        src={getMidtransSnapScriptUrl(isProduction)}
        data-client-key={process.env.MIDTRANS_CLIENT_KEY ?? ""}
        strategy="lazyOnload"
      />
      <p className="furniture text-[#070707]/50 mb-3">
        <Link href="/account/orders" className="hover:italic">
          ← Pesanan
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#070707]">Rincian</span>
      </p>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h2 className="display-tight text-3xl sm:text-4xl font-medium break-all">{order.orderNumber}</h2>
        <span className="furniture border border-[#070707] px-3 py-1.5">Status: {order.status}</span>
      </div>
      <p className="italic text-sm text-[#070707]/55 mt-2">
        Dipesan{" "}
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

      <div className="mt-8 border-t border-[#070707] pt-8 space-y-8">
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
        {(order.status === "SHIPPED" || order.status === "COMPLETED") && (
          <div className="border border-[#070707] p-5">
            <p className="furniture mb-3">Ekspedisi &amp; resi</p>
            <p className="text-[15px]">
              Kurir: <span className="font-semibold">{order.courierName || "Kurir resmi"}</span>
            </p>
            <p className="text-[15px] mt-1">
              Resi: <span className="font-semibold">{order.trackingNumber || "—"}</span>
            </p>
          </div>
        )}

        {/* Item Pesanan */}
        <div>
          <p className="furniture text-[#070707]/50 mb-2">Rincian produk</p>
          <div className="border-t border-[#070707]">
            {order.items.map((item) => (
              <div key={item.id} className="py-4 border-b border-[#070707]/15 flex items-baseline justify-between gap-4 text-[15px]">
                <div>
                  <p className="font-semibold">{item.productName}</p>
                  <p className="italic text-sm text-[#070707]/55">
                    {item.variantName} — {formatRupiah(item.price)} × {item.qty} pcs
                  </p>
                </div>
                <span className="font-semibold whitespace-nowrap">{formatRupiah(item.subtotal)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alamat & Pembayaran */}
        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <p className="furniture text-[#070707]/50 mb-2">Tujuan pengiriman</p>
            <div className="border-t border-[#070707] pt-4 text-[15px] space-y-1">
              <p className="font-semibold">{order.recipientName} ({order.recipientPhone})</p>
              <p className="italic text-[#070707]/65 leading-relaxed">
                {order.shipAddress}, {order.shipDistrict}, {order.shipCity}, {order.shipProvince} {order.shipPostalCode}
              </p>
              {order.customerNote && (
                <p className="italic text-[#070707]/65 pt-1">Catatan: &ldquo;{order.customerNote}&rdquo;</p>
              )}
            </div>
          </div>

          <div>
            <p className="furniture text-[#070707]/50 mb-2">Rincian pembayaran</p>
            <div className="border-t border-[#070707] pt-4 text-[15px] space-y-2">
              <div className="flex justify-between text-[#070707]/75">
                <span>Subtotal</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#070707]/75">
                <span>Ongkir ({order.shippingZone.name})</span>
                <span>{formatRupiah(order.shippingCost)}</span>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between">
                  <span>Diskon voucher</span>
                  <span>-{formatRupiah(order.discountTotal)}</span>
                </div>
              )}
              <div className="border-t border-[#070707] pt-3 flex justify-between font-semibold text-lg">
                <span>Grand total</span>
                <span className="text-[#EF6F79]">{formatRupiah(order.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Riwayat Status */}
        <div>
          <p className="furniture text-[#070707]/50 mb-2">Riwayat status</p>
          <div className="border-t border-[#070707]">
            {order.histories.map((h) => (
              <div key={h.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 border-b border-[#070707]/15 text-sm">
                <span className="furniture text-[#EF6F79]">●</span>
                <span className="font-semibold">{h.toStatus}</span>
                <span className="italic text-[#070707]/55">
                  {new Date(h.createdAt).toLocaleString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {h.note && <span className="italic text-[#070707]/55">— {h.note}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
