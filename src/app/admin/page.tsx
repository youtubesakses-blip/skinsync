// src/app/admin/page.tsx
// Ringkasan operasional — sistem Didone: KPI strip berpembatas hairline,
// grafik garis datar, dan semua data dalam ruled rows. Tanpa kartu, tanpa chip.

import { db } from "@/lib/db";
import type { OrderStatus } from "../../../generated/prisma/client";
import { formatRupiah } from "@/lib/money";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ringkasan — SkinSync Admin",
};

function formatRingkas(n: number): string {
  if (n >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    return `Rp${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  }
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `Rp${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `Rp${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb`;
  }
  return formatRupiah(n);
}

function deltaLine(now: number, prev: number, noun: string): string {
  if (prev <= 0 && now <= 0) return `belum ada ${noun} tercatat.`;
  if (prev <= 0) return `naik dari ${noun} yang sepi.`;
  const pct = Math.round(((now - prev) / prev) * 100);
  if (pct === 0) return `sama seperti ${noun} lalu.`;
  return pct > 0
    ? `naik ${pct}% dari ${noun} lalu.`
    : `turun ${Math.abs(pct)}% dari ${noun} lalu.`;
}

function statusClass(status: OrderStatus): string {
  switch (status) {
    case "COMPLETED":
      return "st st--selesai";
    case "PROCESSING":
    case "SHIPPED":
    case "PAID":
      return "st st--proses";
    case "PENDING_PAYMENT":
      return "st st--tunggu";
    case "CANCELLED":
    case "EXPIRED":
      return "st st--batal";
    default:
      return "st";
  }
}

function statusLabel(status: OrderStatus): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Menunggu";
    case "PAID":
      return "Dibayar";
    case "PROCESSING":
      return "Diproses";
    case "SHIPPED":
      return "Dikirim";
    case "COMPLETED":
      return "Selesai";
    case "EXPIRED":
      return "Kedaluwarsa";
    case "CANCELLED":
      return "Dibatalkan";
    default:
      return status;
  }
}

const STATUS_ORDER: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "EXPIRED",
  "CANCELLED",
];

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOf14 = new Date(startOfDay.getTime() - 13 * 24 * 60 * 60 * 1000);

  const paidStatuses: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"];

  const [
    todaySales,
    yesterdaySales,
    monthSales,
    prevMonthSales,
    allTimePaidSales,
    orderStatusCounts,
    newCustomersCount,
    recentOrders,
    orderItems,
    last14Orders,
  ] = await Promise.all([
    db.order.aggregate({
      where: { status: { in: paidStatuses }, createdAt: { gte: startOfDay } },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
    db.order.aggregate({
      where: {
        status: { in: paidStatuses },
        createdAt: { gte: startOfYesterday, lt: startOfDay },
      },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
    db.order.aggregate({
      where: { status: { in: paidStatuses }, createdAt: { gte: startOfMonth } },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
    db.order.aggregate({
      where: {
        status: { in: paidStatuses },
        createdAt: { gte: startOfPrevMonth, lt: startOfMonth },
      },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
    db.order.aggregate({
      where: { status: { in: paidStatuses } },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
    db.order.groupBy({ by: ["status"], _count: { id: true } }),
    db.user.count({
      where: { role: "CUSTOMER", createdAt: { gte: startOfMonth } },
    }),
    db.order.findMany({
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.orderItem.findMany({
      where: { order: { status: { in: paidStatuses } } },
      select: { productName: true, variantName: true, qty: true, subtotal: true },
      take: 300,
    }),
    db.order.findMany({
      where: { status: { in: paidStatuses }, createdAt: { gte: startOf14 } },
      select: { grandTotal: true, createdAt: true },
    }),
  ]);

  const statusMap = new Map<string, number>();
  orderStatusCounts.forEach((sc) => statusMap.set(sc.status, sc._count.id));

  const productSalesMap = new Map<string, { qty: number; revenue: number }>();
  orderItems.forEach((item) => {
    const key = `${item.productName} — ${item.variantName}`;
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

  // Deret harian 14 hari untuk grafik datar
  const days: { key: string; label: string; total: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(startOf14.getTime() + i * 24 * 60 * 60 * 1000);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    days.push({
      key,
      label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      total: 0,
    });
  }
  last14Orders.forEach((o) => {
    const key = `${o.createdAt.getFullYear()}-${o.createdAt.getMonth()}-${o.createdAt.getDate()}`;
    const day = days.find((d) => d.key === key);
    if (day) day.total += o.grandTotal;
  });
  const maxTotal = Math.max(1, ...days.map((d) => d.total));
  const peakIdx = days.findIndex((d) => d.total === maxTotal);

  // Koordinat polyline: 720 x 220, padding 8
  const W = 720;
  const H = 220;
  const PAD = 8;
  const pts = days.map((d, i) => {
    const x = PAD + (i / Math.max(1, days.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (d.total / maxTotal) * (H - PAD * 2 - 28);
    return { x, y };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const todayTotal = todaySales._sum.grandTotal || 0;
  const yesterdayTotal = yesterdaySales._sum.grandTotal || 0;
  const monthTotal = monthSales._sum.grandTotal || 0;
  const prevMonthTotal = prevMonthSales._sum.grandTotal || 0;

  const hasRevenue = (allTimePaidSales._sum.grandTotal || 0) > 0;

  return (
    <div className="dash-enter">
      {/* Kepala halaman */}
      <div style={{ ["--d" as string]: "40ms" }}>
        <p className="dash-furniture">Ringkasan — 01</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <h1 className="dash-title">
            Hari ini, <em>dengan tenang.</em>
          </h1>
          <a href="/api/admin/reports/orders/export" download className="dash-btn dash-btn-primary">
            Ekspor CSV pesanan
          </a>
        </div>
        <p className="dash-body mt-4 max-w-2xl opacity-75">
          Angka penjualan, status pesanan, dan produk yang bergerak — dicatat apa adanya,
          tanpa pernak-pernik.
        </p>
      </div>

      {/* Strip KPI — empat angka, dipisah hairline */}
      <section aria-label="Angka utama" className="mt-10" style={{ ["--d" as string]: "80ms" }}>
        <div className="dash-kpis">
          <div className="dash-kpi">
            <p className="dash-furniture">Penjualan hari ini</p>
            <p className="fig dash-nums">{formatRingkas(todayTotal)}</p>
            <p className="delta">
              {deltaLine(todayTotal, yesterdayTotal, "kemarin")} {todaySales._count.id} pesanan lunas.
            </p>
          </div>
          <div className="dash-kpi">
            <p className="dash-furniture">Penjualan bulan ini</p>
            <p className="fig dash-nums">{formatRingkas(monthTotal)}</p>
            <p className="delta">
              {deltaLine(monthTotal, prevMonthTotal, "bulan")} {monthSales._count.id} pesanan lunas.
            </p>
          </div>
          <div className="dash-kpi">
            <p className="dash-furniture">Total penjualan</p>
            <p className="fig dash-nums">{formatRingkas(allTimePaidSales._sum.grandTotal || 0)}</p>
            <p className="delta">{allTimePaidSales._count.id} pesanan sepanjang masa.</p>
          </div>
          <div className="dash-kpi">
            <p className="dash-furniture">Pelanggan baru</p>
            <p className="fig dash-nums">{newCustomersCount}</p>
            <p className="delta">terdaftar bulan ini, dihitung pelan-pelan.</p>
          </div>
        </div>
      </section>

      {/* Grafik — datar, tanpa isi, tanpa gradien */}
      <section aria-label="Arus penjualan" className="dash-section" style={{ ["--d" as string]: "120ms" }}>
        <div className="flex items-baseline justify-between gap-4 mb-6">
          <h2 className="dash-h2">Arus empat belas hari</h2>
          <p className="dash-furniture">Nominal lunas, per hari</p>
        </div>
        <div className="dash-chart-frame">
          {hasRevenue ? (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grafik penjualan 14 hari terakhir">
                {[0.25, 0.5, 0.75].map((f) => (
                  <line
                    key={f}
                    x1={PAD}
                    x2={W - PAD}
                    y1={H * f}
                    y2={H * f}
                    stroke="var(--dash-grid)"
                    strokeWidth="1"
                  />
                ))}
                <path d={line} fill="none" stroke="var(--dash-ink)" strokeWidth="1.5" />
                {pts.map((p, i) =>
                  i === peakIdx ? (
                    <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="var(--dash-accent)" />
                  ) : null
                )}
                <text
                  x={pts[pts.length - 1].x - 4}
                  y={Math.max(16, pts[pts.length - 1].y - 10)}
                  textAnchor="end"
                  fontSize="12"
                  fontStyle="italic"
                  fill="var(--dash-ink)"
                >
                  {days[days.length - 1].label} — {formatRingkas(days[days.length - 1].total)}
                </text>
              </svg>
              <div className="flex justify-between mt-3 dash-furniture" aria-hidden="true">
                <span>{days[0].label}</span>
                <span>{days[6].label}</span>
                <span>{days[days.length - 1].label}</span>
              </div>
              <table className="sr-only">
                <caption>Ringkasan penjualan per hari</caption>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.key}>
                      <th scope="row">{d.label}</th>
                      <td>{formatRupiah(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="dash-body italic py-8 text-center opacity-70">
              Belum ada penjualan lunas dalam empat belas hari terakhir.
            </p>
          )}
        </div>
      </section>

      {/* Status pesanan — tipografi, bukan chip */}
      <section aria-label="Status pesanan" className="dash-section" style={{ ["--d" as string]: "160ms" }}>
        <div className="flex items-baseline justify-between gap-4 mb-2">
          <h2 className="dash-h2">Pesanan per status</h2>
          <Link href="/admin/orders" className="dash-btn-tertiary">
            Semua pesanan
          </Link>
        </div>
        <table className="dash-table">
          <thead>
            <tr>
              <th scope="col">No</th>
              <th scope="col">Status</th>
              <th scope="col" style={{ textAlign: "right" }}>
                Jumlah
              </th>
            </tr>
          </thead>
          <tbody>
            {STATUS_ORDER.map((s, i) => {
              const count = statusMap.get(s) || 0;
              const needsAction = s === "PENDING_PAYMENT" && count > 0;
              return (
                <tr key={s} className={needsAction ? "is-selected" : undefined}>
                  <td className="c-idx">{String(i + 1).padStart(2, "0")}</td>
                  <td>
                    <span className={needsAction ? "st st--aksi" : statusClass(s)}>
                      {needsAction ? "Perlu tindakan — Menunggu" : statusLabel(s)}
                    </span>
                  </td>
                  <td className="c-num dash-nums">{count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Produk terlaris + pesanan terbaru */}
      <section aria-label="Produk dan pesanan" className="dash-section" style={{ ["--d" as string]: "200ms" }}>
        <div className="grid md:grid-cols-2 gap-14">
          <div>
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <h2 className="dash-h2">Paling banyak dibeli</h2>
              <p className="dash-furniture">Qty lunas</p>
            </div>
            {topProducts.length === 0 ? (
              <div className="dash-empty">
                <p className="big">Belum ada yang terjual.</p>
                <p className="script-accent text-2xl mt-3" style={{ transform: "rotate(-2deg)" }}>
                  mulai dari pesanan pertama
                </p>
              </div>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th scope="col">No</th>
                    <th scope="col">Produk</th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Terjual
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, idx) => (
                    <tr key={p.name}>
                      <td className="c-idx">{String(idx + 1).padStart(2, "0")}</td>
                      <td>
                        <span className="c-name">{p.name}</span>
                        <span className="c-note">{formatRupiah(p.revenue)} terkumpul</span>
                      </td>
                      <td className="c-num dash-nums">{p.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <h2 className="dash-h2">Baru masuk</h2>
              <Link href="/admin/orders" className="dash-btn-tertiary">
                Semua pesanan
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="dash-empty">
                <p className="big">Belum ada pesanan hari ini.</p>
                <p className="script-accent text-2xl mt-3" style={{ transform: "rotate(-2deg)" }}>
                  dinikmati pelan-pelan
                </p>
              </div>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th scope="col">No</th>
                    <th scope="col">Pesanan</th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Nominal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o, idx) => (
                    <tr key={o.id}>
                      <td className="c-idx">{String(idx + 1).padStart(2, "0")}</td>
                      <td>
                        <Link href={`/admin/orders/${o.id}`} className="rowlink">
                          {o.orderNumber}
                        </Link>
                        <span className="c-note">
                          {o.user.name} — <span className={statusClass(o.status)}>{statusLabel(o.status)}</span>
                        </span>
                      </td>
                      <td className="c-price dash-nums">{formatRupiah(o.grandTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <p className="dash-furniture mt-14" style={{ ["--d" as string]: "240ms" }}>
        SkinSync — dicatat {now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}
