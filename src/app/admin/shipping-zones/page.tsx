// src/app/admin/shipping-zones/page.tsx
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import ShippingZonesManagerClient from "@/components/admin/ShippingZonesManagerClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zona & Tarif Ongkir — SkinSync Admin",
};

export default async function AdminShippingZonesPage() {
  await requireAdmin();

  const zones = await db.shippingZone.findMany({
    orderBy: { cost: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Zona & Tarif Ongkir Flat</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Atur tarif flat pengiriman berdasarkan provinsi atau kota spesifik tujuan pelanggan
        </p>
      </div>

      <ShippingZonesManagerClient initialZones={zones} />
    </div>
  );
}
