// src/app/admin/page.tsx
// Dashboard Admin: metrik penjualan harian & bulanan, pesanan per status, produk terlaris, ekspor CSV

import { db } from "@/lib/db";
import type { OrderStatus } from "../../../generated/prisma/client";
import { formatRupiah } from "@/lib/money";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Operasional — SkinSync Admin",
};

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const paidStatuses: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"];

  const [
    todaySales,
    monthSales,
    allTimePaidSales,
    orderStatusCounts,
    newCustomersCount,
    recentOrders,
    orderItems,
  ] = await Promise.all([
    // Penjualan hari ini
    db.order.aggregate({
      where: {
        status: { in: paidStatuses },
        createdAt: { gte: startOfDay },
      },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),

    // Penjualan bulan ini
    db.order.aggregate({
      where: {
        status: { in: paidStatuses },
        createdAt: { gte: startOfMonth },
      },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),

    // Total penjualan keseluruhan (paid)
    db.order.aggregate({
      where: { status: { in: paidStatuses } },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),

    // Jumlah pesanan per status
    db.order.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // Pelanggan baru bulan ini
    db.user.count({
      where: {
        role: "CUSTOMER",
        createdAt: { gte: startOfMonth },
      },
    }),

    // Pesanan terbaru
    db.order.findMany({
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // Untuk perhitungan produk terlaris
    db.orderItem.findMany({
      where: {
        order: { status: { in: paidStatuses } },
      },
      select: {
        productName: true,
        variantName: true,
        qty: true,
        subtotal: true,
      },
      take: 200,
    }),
  ]);

  // Status mapping
  const statusMap = new Map<string, number>();
  orderStatusCounts.forEach((sc) => statusMap.set(sc.status, sc._count.id));

  // Hitung produk terlaris
  const productSalesMap = new Map<string, { qty: number; revenue: number }>();
  orderItems.forEach((item) => {
    const key = `${item.productName} (${item.variantName})`;
    const current = productSalesMap.get(key) || { qty: 0, revenue: 0 };
    productSalesMap.set(key, {
      qty: current.qty + item.qty,
      revenue: current.revenue + item.subtotal,
    });
  });

  const topProducts = Array.from(productSalesMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ringkasan Operasional</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Data statistik penjualan, performa toko, dan aktivitas pesanan terkini
          </p>
        </div>

        <a
          href="/api/admin/reports/orders/export"
          download
          className="inline-flex items-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Ekspor CSV Pesanan
        </a>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Penjualan Hari Ini</p>
          <h3 className="text-2xl font-black text-slate-900">
            {formatRupiah(todaySales._sum.grandTotal || 0)}
          </h3>
          <p className="text-[11px] text-slate-400">{todaySales._count.id} pesanan berhasil</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Penjualan Bulan Ini</p>
          <h3 className="text-2xl font-black text-indigo-600">
            {formatRupiah(monthSales._sum.grandTotal || 0)}
          </h3>
          <p className="text-[11px] text-slate-400">{monthSales._count.id} pesanan berhasil</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Penjualan</p>
          <h3 className="text-2xl font-black text-slate-900">
            {formatRupiah(allTimePaidSales._sum.grandTotal || 0)}
          </h3>
          <p className="text-[11px] text-slate-400">{allTimePaidSales._count.id} pesanan sepanjang masa</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pelanggan Baru (Bulan Ini)</p>
          <h3 className="text-2xl font-black text-emerald-600">{newCustomersCount}</h3>
          <p className="text-[11px] text-slate-400">Pengguna terdaftar baru</p>
        </div>
      </div>

      {/* Orders By Status Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Status Pesanan</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          {[
            { label: "Menunggu Bayar", count: statusMap.get("PENDING_PAYMENT") || 0, color: "text-amber-600 bg-amber-50" },
            { label: "Dibayar", count: statusMap.get("PAID") || 0, color: "text-blue-600 bg-blue-50" },
            { label: "Diproses", count: statusMap.get("PROCESSING") || 0, color: "text-purple-600 bg-purple-50" },
            { label: "Sedang Dikirim", count: statusMap.get("SHIPPED") || 0, color: "text-indigo-600 bg-indigo-50" },
            { label: "Selesai", count: statusMap.get("COMPLETED") || 0, color: "text-emerald-600 bg-emerald-50" },
            { label: "Kedaluwarsa", count: statusMap.get("EXPIRED") || 0, color: "text-slate-600 bg-slate-50" },
            { label: "Dibatalkan", count: statusMap.get("CANCELLED") || 0, color: "text-red-600 bg-red-50" },
          ].map((s) => (
            <div key={s.label} className={`p-3.5 rounded-xl border border-slate-100 ${s.color}`}>
              <div className="text-xl font-black">{s.count}</div>
              <div className="text-[11px] font-semibold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Grid: Top Selling Products & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Produk Terlaris</h2>
          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Belum ada transaksi produk selesai.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {topProducts.map((p, idx) => (
                <div key={p.name} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-500 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-indigo-600 block">{p.qty} terjual</span>
                    <span className="text-[10px] text-slate-400">{formatRupiah(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pesanan Terbaru</h2>
            <Link href="/admin/orders" className="text-xs font-semibold text-indigo-600 hover:underline">
              Semua Pesanan →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Belum ada pesanan masuk.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentOrders.map((o) => (
                <div key={o.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <Link href={`/admin/orders/${o.id}`} className="font-bold text-indigo-600 hover:underline block">
                      {o.orderNumber}
                    </Link>
                    <span className="text-slate-500">{o.user.name} ({o.user.phone})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-800 block">{formatRupiah(o.grandTotal)}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
