// src/app/account/layout.tsx
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ShopNavbar from "@/components/shop/ShopNavbar";

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ShopNavbar session={session} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar Menu */}
          <aside className="md:col-span-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm h-fit space-y-4">
            <div className="border-b pb-4">
              <p className="text-xs text-gray-400">Akun Pelanggan</p>
              <h2 className="text-base font-bold text-gray-900 truncate">{session.name}</h2>
              <p className="text-xs text-gray-500">{session.phone}</p>
            </div>

            <nav className="space-y-1 text-sm font-medium">
              <Link
                href="/account"
                className="block px-3 py-2 rounded-xl text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
              >
                Profil & Jenis Kulit
              </Link>
              <Link
                href="/account/orders"
                className="block px-3 py-2 rounded-xl text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
              >
                Pesanan Saya
              </Link>
              <Link
                href="/account/addresses"
                className="block px-3 py-2 rounded-xl text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
              >
                Buku Alamat
              </Link>
            </nav>
          </aside>

          {/* Main Account Content */}
          <main className="md:col-span-3">{children}</main>
        </div>
      </div>
    </div>
  );
}
