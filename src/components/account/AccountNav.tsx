// src/components/account/AccountNav.tsx
// Sidebar akun — ruled text rows, furniture, satu aksen pink untuk posisi aktif.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { no: string; label: string; href: string; match: (p: string) => boolean }[] = [
  {
    no: "01",
    label: "Profil & Jenis Kulit",
    href: "/account",
    match: (p) => p === "/account",
  },
  {
    no: "02",
    label: "Pesanan Saya",
    href: "/account/orders",
    match: (p) => p.startsWith("/account/orders"),
  },
  {
    no: "03",
    label: "Buku Alamat",
    href: "/account/addresses",
    match: (p) => p.startsWith("/account/addresses"),
  },
];

export default function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="border-t border-[#070707]">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-baseline gap-4 py-3 border-b border-[#070707]/15 text-[15px] transition-all ${
              active ? "font-semibold" : "hover:italic"
            }`}
          >
            <span className="furniture text-[#EF6F79] w-8 shrink-0">{item.no}</span>
            <span>{item.label}</span>
            {active && <span className="ml-auto furniture text-[#070707]/40">—</span>}
          </Link>
        );
      })}
    </nav>
  );
}
