// src/app/api/admin/reports/orders/export/route.ts
// Ekspor data pesanan ke format CSV untuk laporan admin

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const orders = await db.order.findMany({
    include: {
      user: { select: { name: true, phone: true } },
      items: true,
      shippingZone: true,
      voucher: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "No Pesanan",
    "Tanggal (WIB)",
    "Status",
    "Nama Pelanggan",
    "No WA",
    "Penerima",
    "No WA Penerima",
    "Provinsi",
    "Kota",
    "Alamat Lengkap",
    "Subtotal (IDR)",
    "Ongkos Kirim (IDR)",
    "Diskon Voucher (IDR)",
    "Grand Total (IDR)",
    "Voucher Digunakan",
    "Kurir",
    "Nomor Resi",
    "Rincian Produk",
  ];

  const rows = orders.map((o) => {
    const dateStr = new Date(o.createdAt).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
    });
    const itemsSummary = o.items
      .map((i) => `${i.productName} (${i.variantName}) x${i.qty}`)
      .join(" | ");

    return [
      `"${o.orderNumber}"`,
      `"${dateStr}"`,
      `"${o.status}"`,
      `"${o.user.name}"`,
      `"${o.user.phone}"`,
      `"${o.recipientName}"`,
      `"${o.recipientPhone}"`,
      `"${o.shipProvince}"`,
      `"${o.shipCity}"`,
      `"${o.shipAddress.replace(/"/g, '""')}"`,
      o.subtotal,
      o.shippingCost,
      o.discountTotal,
      o.grandTotal,
      `"${o.voucher?.code || "-"}"`,
      `"${o.courierName || "-"}"`,
      `"${o.trackingNumber || "-"}"`,
      `"${itemsSummary.replace(/"/g, '""')}"`,
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pesanan-skinsync-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
