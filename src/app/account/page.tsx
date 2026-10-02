// src/app/account/page.tsx
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import ProfileFormClient from "@/components/account/ProfileFormClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil & Informasi Kulit — SkinSync",
  description: "Kelola data pribadi dan preferensi jenis kulit Anda di SkinSync.",
};

export default async function AccountProfilePage() {
  const session = await getSession();
  if (!session) return null;

  const [user, skinTypes] = await Promise.all([
    db.user.findUnique({
      where: { id: session.userId },
      include: { skinType: true },
    }),
    db.skinType.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!user) return null;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-xl font-extrabold text-gray-900">Profil & Data Kulit</h1>
        <p className="text-xs text-gray-500 mt-1">
          Lengkapi data profil dan jenis kulit agar pengalaman belanja skincare Anda lebih personal
        </p>
      </div>

      <ProfileFormClient
        user={{
          name: user.name,
          phone: user.phone,
          skinTypeId: user.skinTypeId,
          allergies: user.allergies,
        }}
        skinTypes={skinTypes}
      />
    </div>
  );
}
