// src/app/admin/vouchers/page.tsx
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import VoucherManagerClient from "@/components/admin/VoucherManagerClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Voucher Diskon — SkinSync Admin",
};

export default async function AdminVouchersPage() {
  await requireAdmin();

  const vouchers = await db.voucher.findMany({
    orderBy: { id: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Voucher Diskon</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Buat voucher diskon persen, potongan harga flat, atau bebas biaya ongkir
        </p>
      </div>

      <VoucherManagerClient initialVouchers={vouchers} />
    </div>
  );
}
