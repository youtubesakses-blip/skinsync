// src/app/admin/orders/page.tsx
// Daftar pesanan admin dengan filter status, pencarian nomor pesanan / nama pelanggan

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import type { OrderStatus, Prisma } from "../../../../generated/prisma/client";
import { formatRupiah } from "@/lib/money";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Pesanan — SkinSync Admin",
};

interface AdminOrdersPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const status = params.status || "";
  const q = params.q || "";
  const page = parseInt(params.page || "1", 10);
  const pageSize = 15;

  const where: Prisma.OrderWhereInput = {};
  if (status) {
    where.status = status as OrderStatus;
  }
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { recipientName: { contains: q, mode: "insensitive" } },
      { recipientPhone: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [totalCount, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      include: {
        user: { select: { name: true, phone: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const statuses = [
    { label: "Semua Status", value: "" },
    { label: "Menunggu Bayar", value: "PENDING_PAYMENT" },
    { label: "Dibayar (PAID)", value: "PAID" },
    { label: "Diproses (PROCESSING)", value: "PROCESSING" },
    { label: "Sedang Dikirim (SHIPPED)", value: "SHIPPED" },
    { label: "Selesai (COMPLETED)", value: "COMPLETED" },
    { label: "Kedaluwarsa (EXPIRED)", value: "EXPIRED" },
    { label: "Dibatalkan (CANCELLED)", value: "CANCELLED" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Pesanan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {totalCount} pesanan ditemukan
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form method="GET" className="flex flex-1 gap-2 w-full">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Cari no. pesanan, nama pembeli, no WA..."
            className="text-xs p-2.5 border rounded-xl flex-1 bg-slate-50"
          />
          {status && <input type="hidden" name="status" value={status} />}
          <button
            type="submit"
            className="py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition"
          >
            Cari
          </button>
        </form>

        <div className="flex gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {statuses.map((s) => (
            <Link
              key={s.value}
              href={`/admin/orders?${new URLSearchParams({ ...params, status: s.value, page: "1" }).toString()}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                status === s.value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">No. Pesanan</th>
                <th className="p-4">Pelanggan</th>
                <th className="p-4">Tujuan</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Kurir / Resi</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Tidak ada data pesanan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-bold text-slate-900">
                      <Link href={`/admin/orders/${o.id}`} className="hover:text-indigo-600">
                        {o.orderNumber}
                      </Link>
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {new Date(o.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-800 block">{o.recipientName}</span>
                      <span className="text-slate-400 text-[11px]">{o.recipientPhone}</span>
                    </td>
                    <td className="p-4 max-w-xs truncate text-slate-600">
                      {o.shipCity}, {o.shipProvince}
                    </td>
                    <td className="p-4 font-extrabold text-slate-900">
                      {formatRupiah(o.grandTotal)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        o.status === "PAID"
                          ? "bg-blue-50 text-blue-700"
                          : o.status === "PROCESSING"
                          ? "bg-purple-50 text-purple-700"
                          : o.status === "SHIPPED"
                          ? "bg-indigo-50 text-indigo-700"
                          : o.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700"
                          : o.status === "PENDING_PAYMENT"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">
                      {o.courierName ? (
                        <div>
                          <span className="font-semibold">{o.courierName}</span>
                          <span className="block font-mono text-[10px] text-slate-400">{o.trackingNumber}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="py-1 px-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold rounded-lg transition"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Halaman {page} dari {totalPages}</span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/admin/orders?${new URLSearchParams({ ...params, page: p.toString() }).toString()}`}
                  className={`w-7 h-7 flex items-center justify-center rounded-md font-bold ${
                    p === page ? "bg-indigo-600 text-white" : "hover:bg-slate-100"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
