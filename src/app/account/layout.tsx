// src/app/account/layout.tsx
// Layout akun — Aurelle: plaster, hairline, pt-24 agar tidak tertabrak navbar fixed.

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ShopNavbar from "@/components/shop/ShopNavbar";
import AccountNav from "@/components/account/AccountNav";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/account");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F4] text-[#070707]">
      <ShopNavbar session={session} />
      {/* pt-24 = ruang untuk navbar fixed h-14 + napas editorial */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-24 pb-20">
          <p className="furniture text-[#070707]/50 mb-4">
            <Link href="/" className="hover:italic">
              Beranda
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#070707]">Akun</span>
          </p>
          <div className="flex items-baseline justify-between gap-4 mb-10">
            <h1 className="display-tight text-5xl sm:text-6xl font-medium">
              Akun <em className="italic font-normal">saya.</em>
            </h1>
            <Link href="/products" className="furniture underline underline-offset-4 whitespace-nowrap hidden sm:inline">
              Belanja →
            </Link>
          </div>

          <div className="grid lg:grid-cols-[240px_1fr] gap-10 items-start">
            {/* Sidebar */}
            <aside className="lg:sticky lg:top-20">
              <p className="furniture text-[#070707]/50 mb-2">Pelanggan</p>
              <p className="text-xl font-semibold tracking-[-0.01em] truncate">{session.name}</p>
              <p className="italic text-sm text-[#070707]/55 mb-6">{session.phone}</p>
              <AccountNav />
              <p className="italic text-sm text-[#070707]/50 mt-6 leading-relaxed">
                Data kulit dipakai untuk rekomendasi — bukan untuk iklan.
              </p>
            </aside>

            {/* Konten */}
            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </main>

      <footer className="bg-[#070707] text-[#F7F7F4]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
          <div className="furniture flex flex-col sm:flex-row justify-between gap-2 text-[#F7F7F4]/50">
            <p>&copy; {new Date().getFullYear()} SkinSync</p>
            <p>Batch kecil — BPOM RI — 1–5 hari</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
