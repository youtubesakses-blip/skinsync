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
    <section>
      <p className="furniture text-[#070707]/50 mb-3">Alamat — 03</p>
      <h2 className="display-tight text-3xl sm:text-4xl font-medium">
        Buku <em className="italic font-normal">alamat.</em>
      </h2>
      <p className="italic text-[#070707]/60 mt-3 max-w-xl text-[15px] leading-relaxed">
        {addresses.length} alamat tersimpan — checkout jadi satu menit lebih cepat.
      </p>

      <div className="mt-8 border-t border-[#070707] pt-8">
        <AddressManagerClient initialAddresses={addresses} />
      </div>
    </section>
  );
}
