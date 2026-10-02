// src/app/admin/banners/page.tsx
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import BannerManagerClient from "@/components/admin/BannerManagerClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Banner Beranda — SkinSync Admin",
};

export default async function AdminBannersPage() {
  await requireAdmin();

  const banners = await db.banner.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Banner Promo Beranda</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Atur banner carousel promosi yang tampil di beranda utama toko
        </p>
      </div>

      <BannerManagerClient initialBanners={banners} />
    </div>
  );
}
