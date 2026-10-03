// src/app/admin/layout.tsx
// Shell operasional SkinSync: rail kiri 232px bernomor, topbar sticky, konten max 1280px.

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    redirect("/login?next=/admin");
  }

  const isSuperAdmin = session.role === "SUPER_ADMIN";

  const navItems = [
    { label: "Ringkasan", href: "/admin" },
    { label: "Pesanan", href: "/admin/orders" },
    { label: "Produk", href: "/admin/products" },
    { label: "Stok", href: "/admin/stock" },
    { label: "Ongkir", href: "/admin/shipping-zones" },
    { label: "Voucher", href: "/admin/vouchers" },
    { label: "Ulasan", href: "/admin/reviews" },
  ];

  if (isSuperAdmin) {
    navItems.push(
      { label: "Pengguna", href: "/admin/users" },
      { label: "Pengaturan", href: "/admin/settings" }
    );
  }

  return (
    <div className="dash-shell">
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Rail kiri — teks bernomor, tanpa ikon */}
        <aside className="dash-rail" aria-label="Panel admin">
          <div>
            <Link href="/admin" className="dash-brand">
              <span className="wordmark-sm">SkinSync</span>
              <span className="dash-furniture block mt-2">
                Operasional — {session.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
              </span>
            </Link>
            <AdminNav items={navItems} />
          </div>

          <div className="dash-rail-foot">
            <p className="text-[14px] font-medium leading-snug">{session.name}</p>
            <p className="dash-furniture mt-1">{session.phone}</p>
            <Link
              href="/"
              className="dash-btn-tertiary mt-3 inline-block"
            >
              Kembali ke toko
            </Link>
          </div>
        </aside>

        {/* Kolom kanan */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="dash-topbar">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-4 flex items-baseline justify-between gap-4">
              <p className="dash-furniture">SkinSync — Konsol Operasional</p>
              <p className="dash-furniture hidden sm:block">
                Masuk sebagai {session.name}
              </p>
            </div>
          </header>

          <main className="dash-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
