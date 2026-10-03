// src/app/cart/page.tsx
// Keranjang — Aurelle.

import { getSession } from "@/lib/auth";
import { getOrCreateCart } from "@/server/services/cart";
import { redirect } from "next/navigation";
import CartViewClient from "@/components/shop/CartViewClient";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keranjang Belanja — SkinSync",
  description: "Periksa produk pilihan sebelum checkout.",
};

export default async function CartPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/cart");

  const cart = await getOrCreateCart(session.userId);

  return (
    <div className="bg-[#F7F7F4] text-[#070707]">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-24 pb-20">
        <div className="flex items-baseline justify-between mb-10">
          <div>
            <p className="furniture text-[#070707]/50 mb-3">Keranjang — 01</p>
            <h1 className="display-tight text-5xl sm:text-6xl font-medium">Keranjang <em className="italic font-normal">belanja.</em></h1>
          </div>
          <Link href="/products" className="furniture underline underline-offset-4 whitespace-nowrap">← Belanja</Link>
        </div>
        <CartViewClient initialCart={cart} />
      </div>
    </div>
  );
}
