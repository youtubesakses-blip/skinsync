// src/app/(shop)/layout.tsx
// Layout untuk halaman publik shop — navbar dan footer

import { getSession } from "@/lib/auth";
import Link from "next/link";
import ShopNavbar from "@/components/shop/ShopNavbar";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col bg-[#fff8f3]">
      <ShopNavbar session={session} />
      <main className="flex-1">{children}</main>
      <footer className="bg-[#2a1220] text-white/60 mt-4 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#f4733d] via-[#e14b7a] to-[#7c3aed] grid place-items-center text-white text-lg">
                  ✦
                </span>
                <span className="text-white font-extrabold text-lg tracking-tight">
                  SkinSync
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                Skincare BPOM terpercaya untuk semua jenis kulit Indonesia.
                Formula klinis, harga jujur.
              </p>
              <div className="flex gap-2 mt-5">
                {["IG", "TT", "WA"].map((s) => (
                  <span
                    key={s}
                    className="w-9 h-9 rounded-full bg-white/10 grid place-items-center text-xs font-extrabold text-white hover:bg-[#f4733d] transition cursor-pointer"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-wide mb-4">
                BELANJA
              </p>
              <div className="flex flex-col gap-2.5 text-sm">
                <Link href="/products" className="hover:text-white transition">
                  Semua Produk
                </Link>
                <Link href="/#best-seller" className="hover:text-white transition">
                  Best Seller
                </Link>
                <Link href="/#kategori" className="hover:text-white transition">
                  Kategori
                </Link>
                <Link href="/cart" className="hover:text-white transition">
                  Keranjang
                </Link>
              </div>
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-wide mb-4">
                BANTUAN
              </p>
              <div className="flex flex-col gap-2.5 text-sm">
                <Link href="/faq" className="hover:text-white transition">
                  FAQ
                </Link>
                <Link href="/kebijakan/pengiriman" className="hover:text-white transition">
                  Kebijakan Pengiriman
                </Link>
                <Link href="/kebijakan/privasi" className="hover:text-white transition">
                  Kebijakan Privasi
                </Link>
                <Link href="/account/orders" className="hover:text-white transition">
                  Lacak Pesanan
                </Link>
              </div>
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-wide mb-4">
                HUBUNGI KAMI
              </p>
              <div className="bg-white/8 border border-white/10 rounded-3xl p-5">
                <p className="text-sm text-white font-semibold">
                  💬 CS via WhatsApp
                </p>
                <p className="text-xs mt-1">
                  Senin–Sabtu, 09.00–18.00 WIB
                </p>
                <span className="inline-block mt-3 bg-gradient-to-r from-[#f4733d] to-[#e14b7a] text-white text-sm font-bold px-5 py-2.5 rounded-full">
                  Chat Sekarang →
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p>&copy; {new Date().getFullYear()} SkinSync. All rights reserved.</p>
            <p>✓ BPOM · ✓ Pembayaran Aman Midtrans · ✓ Pengiriman Cepat</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
