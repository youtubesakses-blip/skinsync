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

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu pembayaran",
  PAID: "Dibayar",
  PROCESSING: "Diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
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

  return (
    <section>
      <p className="furniture text-[#070707]/50 mb-3">Pesanan — 02</p>
      <h2 className="display-tight text-3xl sm:text-4xl font-medium">
        Pesanan <em className="italic font-normal">saya.</em>
      </h2>
      <p className="italic text-[#070707]/60 mt-3 max-w-xl text-[15px] leading-relaxed">
        {orders.length > 0
          ? `${orders.length} pesanan — resi dikirim via WhatsApp.`
          : "Belum ada pesanan — mulai dari yang paling ringan."}
      </p>

      <div className="mt-8 border-t border-[#070707]">
        {orders.length === 0 ? (
          <div className="py-16 text-center border-b border-[#070707]">
            <p className="italic text-xl text-[#070707]/60">Anda belum memiliki riwayat pesanan.</p>
            <Link
              href="/products"
              className="furniture inline-block mt-6 bg-[#EF6F79] text-[#070707] px-6 py-3.5 hover:bg-[#070707] hover:text-white transition-colors"
            >
              Mulai belanja
            </Link>
          </div>
        ) : (
          orders.map((order, i) => {
            const firstItem = order.items[0];
            const remainingCount = order.items.length - 1;
            return (
              <article
                key={order.id}
                className="py-5 border-b border-[#070707]/15 grid gap-3"
              >
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="furniture text-[#EF6F79] w-8 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-semibold text-lg tracking-[-0.01em]">{order.orderNumber}</span>
                  <span className="italic text-sm text-[#070707]/55">
                    {new Date(order.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="ml-auto furniture border border-[#070707] px-3 py-1.5">
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2 pl-12">
                  <div>
                    <p className="text-[15px]">
                      {firstItem?.productName}{" "}
                      <span className="italic text-[#070707]/60">
                        ({firstItem?.variantName}) × {firstItem?.qty}
                      </span>
                    </p>
                    {remainingCount > 0 && (
                      <p className="italic text-sm text-[#070707]/50">+{remainingCount} produk lainnya</p>
                    )}
                  </div>
                  <p className="text-lg font-semibold text-[#EF6F79]">{formatRupiah(order.grandTotal)}</p>
                </div>

                <div className="pl-12">
                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="furniture underline underline-offset-4 hover:italic"
                  >
                    Lihat rincian →
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
