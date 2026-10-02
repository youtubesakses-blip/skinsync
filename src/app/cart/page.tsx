// src/app/cart/page.tsx
// Halaman Keranjang Belanja

import { getSession } from "@/lib/auth";
import { getOrCreateCart } from "@/server/services/cart";
import { redirect } from "next/navigation";
import CartViewClient from "@/components/shop/CartViewClient";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keranjang Belanja — SkinSync",
  description: "Tinjau produk dalam keranjang belanja Anda sebelum melanjutkan ke checkout.",
};

export default async function CartPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/cart");
  }

  const cart = await getOrCreateCart(session.userId);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header & Back */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Keranjang Belanja</h1>
            <p className="text-sm text-gray-500 mt-1">
              Periksa produk pilihan Anda sebelum menyelesaikan pesanan
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            ← Lanjut Belanja
          </Link>
        </div>

        <CartViewClient initialCart={cart} />
      </div>
    </div>
  );
}
