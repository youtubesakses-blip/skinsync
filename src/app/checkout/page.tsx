// src/app/checkout/page.tsx
// Checkout — Aurelle wrapper.

import { getSession } from "@/lib/auth";
import { getOrCreateCart } from "@/server/services/cart";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import CheckoutClient from "@/components/shop/CheckoutClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout Pesanan — SkinSync",
  description: "Selesaikan pemesanan dengan aman.",
};

export default async function CheckoutPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/checkout");

  const [cart, addresses, shippingZones] = await Promise.all([
    getOrCreateCart(session.userId),
    db.address.findMany({
      where: { userId: session.userId },
      orderBy: [{ isDefault: "desc" }, { id: "desc" }],
    }),
    db.shippingZone.findMany({ where: { isActive: true }, orderBy: { cost: "asc" } }),
  ]);

  if (!cart.items || cart.items.length === 0) redirect("/cart");

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const snapScriptUrl = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
  const clientKey = process.env.MIDTRANS_CLIENT_KEY || "";

  return (
    <div className="bg-[#F7F7F4] text-[#070707]">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-24 pb-20">
        <p className="furniture text-[#070707]/50 mb-3">Checkout — 02</p>
        <h1 className="display-tight text-5xl sm:text-6xl font-medium">Checkout <em className="italic font-normal">pesanan.</em></h1>
        <p className="italic text-[#070707]/60 mt-3">Alamat → pengiriman & voucher → bayar.</p>
        <div className="mt-10">
          <CheckoutClient
            initialCart={cart}
            initialAddresses={addresses}
            shippingZones={shippingZones}
            snapScriptUrl={snapScriptUrl}
            clientKey={clientKey}
          />
        </div>
      </div>
    </div>
  );
}
