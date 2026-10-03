// src/components/shop/ShopNavbar.tsx
// Navbar Aurelle — fixed, difference-blended, furniture type, hairline only

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionPayload } from "@/lib/auth";

interface ShopNavbarProps {
  session: SessionPayload | null;
}

const LINKS: [string, string][] = [
  ["Katalog", "/products"],
  ["Koleksi", "/#produk"],
  ["Ritual", "/#ritual"],
  ["FAQ", "/faq"],
];

export default function ShopNavbar({ session }: ShopNavbarProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isAdmin = session?.role === "ADMIN" || session?.role === "SUPER_ADMIN";

  return (
    <div className="fixed top-0 inset-x-0 z-50 mix-blend-difference text-white">
      <div className="furniture flex items-center justify-between px-4 sm:px-8 h-14 border-b border-white/40">
        <Link href="/" className="font-semibold tracking-[0.18em]">
          SKINSYNC
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {LINKS.map(([label, href]) => (
            <Link key={label} href={href} className="hover:opacity-60 transition-opacity">
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link href="/cart" aria-label="Keranjang" className="hover:opacity-60 transition-opacity">
            Keranjang
          </Link>
          {session ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="hidden sm:inline hover:opacity-60 transition-opacity">
                  Admin
                </Link>
              )}
              <Link href="/account" className="max-w-[120px] truncate hover:opacity-60 transition-opacity">
                {session.name}
              </Link>
              <button onClick={handleLogout} disabled={isLoggingOut} className="hover:opacity-60 transition-opacity">
                {isLoggingOut ? "..." : "Keluar"}
              </button>
            </>
          ) : (
            <Link href="/login" className="hover:opacity-60 transition-opacity">
              Masuk
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
