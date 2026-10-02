// src/app/account/orders/page.tsx
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Riwayat Pesanan Saya — SkinSync",
  description: "Lihat status dan riwayat semua pesanan skincare Anda.",
};

export default async function CustomerOrdersPage() {
  const session = await getSession();
  if (!session) return null;

  const orders = await db.order.findMany({
    where: { userId: session.userId },
    include: {
      items: true,
      payments: { take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">Menunggu Pembayaran</span>;
      case "PAID":
        return <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">Dibayar</span>;
      case "PROCESSING":
        return <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200">Diproses</span>;
      case "SHIPPED":
        return <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-200">Sedang Dikirim</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">Selesai</span>;
      case "EXPIRED":
        return <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-bold text-[11px]">Kedaluwarsa</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold text-[11px]">Dibatalkan</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-xl font-extrabold text-gray-900">Pesanan Saya</h1>
        <p className="text-xs text-gray-500 mt-1">
          Lacak status pemrosesan dan pengiriman produk yang Anda pesan
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-sm text-gray-400">Anda belum memiliki riwayat pesanan.</p>
          <Link
            href="/products"
            className="inline-block py-2.5 px-6 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition"
          >
            Mulai Belanja Sekarang
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const firstItem = order.items[0];
            const remainingCount = order.items.length - 1;

            return (
              <div
                key={order.id}
                className="border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-xs">
                  <div>
                    <span className="font-extrabold text-gray-900 text-sm">{order.orderNumber}</span>
                    <span className="text-gray-400 ml-2">
                      {new Date(order.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-800">
                      {firstItem?.productName} ({firstItem?.variantName}) x {firstItem?.qty}
                    </p>
                    {remainingCount > 0 && (
                      <p className="text-gray-400">+{remainingCount} produk lainnya</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 block">Total Pesanan:</span>
                    <span className="text-sm font-extrabold text-indigo-600">
                      {formatRupiah(order.grandTotal)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="py-2 px-4 rounded-xl border border-indigo-600 text-indigo-600 font-bold text-xs hover:bg-indigo-50 transition"
                  >
                    Lihat Rincian & Riwayat →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
