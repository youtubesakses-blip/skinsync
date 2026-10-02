// src/app/checkout/page.tsx
// Halaman Checkout (wajib login, 3 langkah)

import { getSession } from "@/lib/auth";
import { getOrCreateCart } from "@/server/services/cart";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import CheckoutClient from "@/components/shop/CheckoutClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout Pesanan — SkinSync",
  description: "Selesaikan pemesanan produk skincare Anda dengan aman dan mudah.",
};

export default async function CheckoutPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/checkout");
  }

  const [cart, addresses, shippingZones] = await Promise.all([
    getOrCreateCart(session.userId),
    db.address.findMany({
      where: { userId: session.userId },
      orderBy: [{ isDefault: "desc" }, { id: "desc" }],
    }),
    db.shippingZone.findMany({
      where: { isActive: true },
      orderBy: { cost: "asc" },
    }),
  ]);

  if (!cart.items || cart.items.length === 0) {
    redirect("/cart");
  }

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const snapScriptUrl = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
  const clientKey = process.env.MIDTRANS_CLIENT_KEY || "";

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Checkout Pesanan</h1>
          <p className="text-sm text-gray-500 mt-1">
            Langkah 1: Alamat → Langkah 2: Pengiriman & Voucher → Langkah 3: Bayar
          </p>
        </div>

        <CheckoutClient
          initialCart={cart}
          initialAddresses={addresses}
          shippingZones={shippingZones}
          snapScriptUrl={snapScriptUrl}
          clientKey={clientKey}
        />
      </div>
    </div>
  );
}
