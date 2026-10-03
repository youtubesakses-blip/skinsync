// src/components/shop/ShopNavbar.tsx
// Navbar toko — logo, navigasi, cart icon, login/logout

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionPayload } from "@/lib/auth";

interface ShopNavbarProps {
  session: SessionPayload | null;
}

export default function ShopNavbar({ session }: ShopNavbarProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Logout gagal. Silakan coba lagi.");
      }

      router.replace("/");
      router.refresh();
    } catch {
      setLogoutError("Logout gagal. Silakan coba lagi.");
      setIsLoggingOut(false);
    }
  };

  const isAdmin = session?.role === "ADMIN" || session?.role === "SUPER_ADMIN";

  return (
    <div className="sticky top-0 z-50">
      {/* Announcement bar */}
      <div className="bg-[#2a1220] text-white/90 text-center text-[13px] font-medium tracking-wide px-4 py-2">
        ✨ Gratis ongkir se-Jawa untuk pembelian di atas Rp150.000
        <Link href="/products" className="ml-2 underline underline-offset-2 text-amber-300 hover:text-amber-200">
          Belanja sekarang
        </Link>
      </div>
      <header className="bg-[#fff8f3]/85 backdrop-blur-xl border-b border-[#2a1220]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-[72px]">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#f4733d] via-[#e14b7a] to-[#7c3aed] grid place-items-center text-white text-lg shadow-lg shadow-orange-500/25 group-hover:rotate-6 transition-transform">
                ✦
              </span>
              <span className="leading-none">
                <span className="block text-[19px] font-extrabold tracking-tight text-[#2a1220]">
                  SkinSync
                </span>
                <span className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-[#f4733d]">
                  Glow science
                </span>
              </span>
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium bg-white/70 border border-[#2a1220]/10 rounded-full px-2 py-1.5 shadow-sm">
              {[
                ["Produk", "/products"],
                ["Kategori", "/#kategori"],
                ["Best Seller", "/#best-seller"],
                ["Testimoni", "/#testimoni"],
                ["FAQ", "/faq"],
              ].map(([label, href]) => (
                <Link
                  key={href + label}
                  href={href}
                  className="px-4 py-1.5 rounded-full text-[#2a1220]/70 hover:text-[#2a1220] hover:bg-[#fde7db] transition"
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right: cart + auth */}
            <div className="flex items-center gap-2">
              {/* Cart icon */}
              <Link
                href="/cart"
                className="relative w-10 h-10 grid place-items-center rounded-full bg-white border border-[#2a1220]/10 text-[#2a1220] hover:border-[#f4733d] hover:text-[#f4733d] transition shadow-sm"
                aria-label="Keranjang"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#f4733d] text-white text-[10px] font-bold grid place-items-center">
                  •
                </span>
              </Link>

              {session ? (
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="hidden sm:inline-flex text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-2 rounded-full transition"
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/account"
                    className="max-w-[110px] truncate text-sm font-semibold text-[#2a1220] bg-white border border-[#2a1220]/10 hover:border-[#f4733d] px-3 py-2 rounded-full transition"
                  >
                    {session.name}
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="text-sm text-[#2a1220]/50 hover:text-red-600 transition px-1"
                  >
                    {isLoggingOut ? "Keluar..." : "Keluar"}
                  </button>
                  {logoutError && (
                    <span role="alert" className="text-xs text-red-600">
                      {logoutError}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:inline text-sm font-semibold text-[#2a1220] px-4 py-2 rounded-full hover:bg-white transition"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/login"
                    className="text-sm font-bold bg-[#2a1220] text-white px-5 py-2.5 rounded-full hover:bg-[#f4733d] transition shadow-lg shadow-[#2a1220]/20"
                  >
                    Mulai Glow ✨
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
