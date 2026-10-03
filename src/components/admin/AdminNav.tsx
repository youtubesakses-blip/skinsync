// src/components/admin/AdminNav.tsx
// Rail navigasi teks bernomor — tanpa ikon, tanpa emoji, tanpa pill.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface AdminNavItem {
  label: string;
  href: string;
}

export default function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="dash-nav" aria-label="Navigasi admin">
      {items.map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
        >
          <span className="idx" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
