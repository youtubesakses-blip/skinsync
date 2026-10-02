// src/app/sitemap.ts
import { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Memaksa route menjadi dynamic agar TIDAK di-prerender saat build time (saat DB Railway offline)
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.APP_URL || "https://skinsync.id";

  // Inisialisasi array kosong sebagai fallback jika database tidak terjangkau saat build
  let products: { slug: string; updatedAt: Date }[] = [];
  let categories: { slug: string }[] = [];

  try {
    [products, categories] = await Promise.all([
      db.product.findMany({
        where: { isActive: true, deletedAt: null },
        select: { slug: true, updatedAt: true },
      }),
      db.category.findMany({
        where: { isActive: true },
        select: { slug: true },
      }),
    ]);
  } catch (error) {
    console.warn("[Sitemap] Gagal mengambil data DB saat build/prerender:", error);
  }

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}/categories/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/faq`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/kebijakan/privasi`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/kebijakan/pengiriman`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/kebijakan/retur`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  return [...staticEntries, ...categoryEntries, ...productEntries];
}