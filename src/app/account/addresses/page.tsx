// src/app/account/addresses/page.tsx
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AddressManagerClient from "@/components/account/AddressManagerClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buku Alamat Pengiriman — SkinSync",
  description: "Kelola daftar alamat pengiriman tersimpan Anda.",
};

export default async function AccountAddressesPage() {
  const session = await getSession();
  if (!session) return null;

  const addresses = await db.address.findMany({
    where: { userId: session.userId },
    orderBy: [{ isDefault: "desc" }, { id: "desc" }],
  });

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-xl font-extrabold text-gray-900">Buku Alamat</h1>
        <p className="text-xs text-gray-500 mt-1">
          Daftar alamat pengiriman Anda untuk kemudahan dan kecepatan proses checkout
        </p>
      </div>

      <AddressManagerClient initialAddresses={addresses} />
    </div>
  );
}
