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
    <section>
      <p className="furniture text-[#070707]/50 mb-3">Profil — 01</p>
      <h2 className="display-tight text-3xl sm:text-4xl font-medium">
        Profil &amp; <em className="italic font-normal">data kulit.</em>
      </h2>
      <p className="italic text-[#070707]/60 mt-3 max-w-xl text-[15px] leading-relaxed">
        Lengkapi jenis kulit agar rekomendasi lebih tepat. Satu menit, tanpa drama.
      </p>

      <div className="mt-8 border-t border-[#070707] pt-8">
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
    </section>
  );
}
