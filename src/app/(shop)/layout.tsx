// src/app/(shop)/layout.tsx
// Layout publik — navbar difference + footer near-black hairline

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
    <div className="min-h-screen flex flex-col bg-[#F7F7F4] text-[#070707]">
      <ShopNavbar session={session} />
      <main className="flex-1">{children}</main>
      <footer className="bg-[#070707] text-[#F7F7F4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-16 pb-8">
          <div className="furniture flex flex-wrap gap-x-8 gap-y-2 text-[#F7F7F4]/60 pb-8">
            <span>No. 01 — Jakarta</span>
            <span>Batch kecil</span>
            <span>BPOM RI</span>
          </div>

          <p className="display-tight text-[13vw] md:text-[7.5rem] font-medium leading-[0.85] tracking-[-0.05em]">
            SkinSync<span className="italic font-normal">.</span>
          </p>

          <div className="grid md:grid-cols-4 gap-8 mt-12 pt-8 border-t border-white/20 text-sm">
            <div>
              <p className="furniture text-[#F7F7F4]/50 mb-4">Toko</p>
              <div className="flex flex-col gap-2">
                <Link href="/products" className="hover:opacity-60 transition-opacity w-fit">Semua produk</Link>
                <Link href="/#produk" className="hover:opacity-60 transition-opacity w-fit">Koleksi</Link>
                <Link href="/cart" className="hover:opacity-60 transition-opacity w-fit">Keranjang</Link>
              </div>
            </div>
            <div>
              <p className="furniture text-[#F7F7F4]/50 mb-4">Bantuan</p>
              <div className="flex flex-col gap-2">
                <Link href="/faq" className="hover:opacity-60 transition-opacity w-fit">FAQ</Link>
                <Link href="/kebijakan/pengiriman" className="hover:opacity-60 transition-opacity w-fit">Pengiriman</Link>
                <Link href="/account/orders" className="hover:opacity-60 transition-opacity w-fit">Lacak pesanan</Link>
              </div>
            </div>
            <div className="md:col-span-2">
              <p className="furniture text-[#F7F7F4]/50 mb-4">Catatan</p>
              <p className="italic text-[#F7F7F4]/80 leading-relaxed max-w-md">
                Formula klinis dalam batch kecil. Niacinamide 5%, 30 ml — tanpa pewangi tambahan, tanpa janji berlebihan.
              </p>
              <p className="furniture mt-6 text-[#F7F7F4]/50">
                Senin–Sabtu, 09.00–18.00 WIB — CS via WhatsApp
              </p>
            </div>
          </div>

          <div className="furniture flex flex-col sm:flex-row justify-between gap-2 mt-10 pt-6 border-t border-white/20 text-[#F7F7F4]/50">
            <p>&copy; {new Date().getFullYear()} SkinSync</p>
            <p>BPOM — Pembayaran aman — Pengiriman 1–5 hari</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
