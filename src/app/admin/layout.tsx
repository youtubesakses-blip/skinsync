// src/app/admin/layout.tsx
// Layout panel admin: sidebar navigasi, header peran (ADMIN / SUPER_ADMIN)

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

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

  const navLinks = [
    { label: "Dashboard", href: "/admin", icon: "📊" },
    { label: "Pesanan", href: "/admin/orders", icon: "📦" },
    { label: "Produk & Varian", href: "/admin/products", icon: "🧴" },
    { label: "Manajemen Stok", href: "/admin/stock", icon: "📋" },
    { label: "Zona Ongkir", href: "/admin/shipping-zones", icon: "🚚" },
    { label: "Voucher Diskon", href: "/admin/vouchers", icon: "🎟️" },
    { label: "Banner Promo", href: "/admin/banners", icon: "🖼️" },
    { label: "Moderasi Ulasan", href: "/admin/reviews", icon: "⭐" },
  ];

  if (isSuperAdmin) {
    navLinks.push(
      { label: "Kelola Admin", href: "/admin/users", icon: "👥" },
      { label: "Pengaturan & WA", href: "/admin/settings", icon: "⚙️" }
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-800">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col justify-between">
        <div>
          {/* Brand */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <Link href="/admin" className="text-xl font-black tracking-tight text-white">
              SkinSync <span className="text-xs font-semibold text-indigo-400">Admin</span>
            </Link>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-900 text-indigo-200">
              {session.role}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 text-sm font-medium">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <div>
            <p className="font-semibold text-white">{session.name}</p>
            <p className="text-[11px] text-slate-500">{session.phone}</p>
          </div>
          <Link href="/" className="text-indigo-400 hover:underline">
            Toko ↗
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
          <div className="text-sm font-semibold text-slate-700">
            SkinSync Operations Console
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-500">Masuk sebagai: <strong>{session.name}</strong></span>
            <Link
              href="/"
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition"
            >
              Kembali ke Toko
            </Link>
          </div>
        </header>

        <main className="p-6 sm:p-8 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
