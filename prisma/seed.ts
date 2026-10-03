// prisma/seed.ts
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { normalizePhone } from "../src/lib/phone";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Super Admin
  const adminPhone = normalizePhone(process.env.SEED_SUPER_ADMIN_PHONE || "628123456789");
  const adminName = process.env.SEED_SUPER_ADMIN_NAME || "Super Admin SkinSync";

  const superAdmin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      name: adminName,
    },
    create: {
      phone: adminPhone,
      name: adminName,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`Super Admin ready: ${superAdmin.name} (${superAdmin.phone})`);

  // 2. Jenis Kulit (Skin Types)
  const skinTypesData = [
    { name: "Kulit Normal", slug: "normal" },
    { name: "Kulit Kering", slug: "kering" },
    { name: "Kulit Berminyak", slug: "berminyak" },
    { name: "Kulit Kombinasi", slug: "kombinasi" },
    { name: "Kulit Sensitif", slug: "sensitif" },
  ];

  const skinTypes = [];
  for (const st of skinTypesData) {
    const item = await prisma.skinType.upsert({
      where: { slug: st.slug },
      update: { name: st.name },
      create: st,
    });
    skinTypes.push(item);
  }
  console.log(`Seeded ${skinTypes.length} skin types.`);

  // 3. Masalah Kulit (Skin Concerns)
  const skinConcernsData = [
    { name: "Jerawat & Bekas Jerawat", slug: "jerawat" },
    { name: "Kusam & Hiperpigmentasi", slug: "kusam" },
    { name: "Penuaan Dini & Garis Halus", slug: "penuaan" },
    { name: "Skin Barrier Rusak / Kemerahan", slug: "barrier" },
    { name: "Pori-pori Besar & Komedo", slug: "pori-pori" },
  ];

  for (const sc of skinConcernsData) {
    await prisma.skinConcern.upsert({
      where: { slug: sc.slug },
      update: { name: sc.name },
      create: sc,
    });
  }
  console.log(`Seeded skin concerns.`);

  // 4. Kategori Produk
  const categoriesData = [
    { name: "Pembersih Wajah", slug: "cleanser", sortOrder: 1 },
    { name: "Toner & Essence", slug: "toner", sortOrder: 2 },
    { name: "Serum & Ampoule", slug: "serum", sortOrder: 3 },
    { name: "Pelembap (Moisturizer)", slug: "moisturizer", sortOrder: 4 },
    { name: "Tabir Surya (Sunscreen)", slug: "sunscreen", sortOrder: 5 },
    { name: "Masker & Perawatan", slug: "mask", sortOrder: 6 },
  ];

  const categoryMap = new Map<string, number>();
  for (const cat of categoriesData) {
    const item = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: cat,
    });
    categoryMap.set(cat.slug, item.id);
  }
  console.log(`Seeded categories.`);

  // 5. Brand Utama
  const brand = await prisma.brand.upsert({
    where: { slug: "skinsync" },
    update: { name: "SkinSync Labs" },
    create: {
      name: "SkinSync Labs",
      slug: "skinsync",
    },
  });
  console.log(`Seeded brand: ${brand.name}`);

  // 6. Shipping Zones (Tarif flat per zona sesuai Bagian 1 & 6.3)
  const shippingZonesData = [
    {
      name: "Surabaya & Jawa Timur (Flat)",
      province: "Jawa Timur",
      city: null, // Berlaku seluruh provinsi
      cost: 10000,
      estimatedDays: "1-2 Hari Kerja",
    },
    {
      name: "Jawa Tengah & DIY (Flat)",
      province: "Jawa Tengah",
      city: null,
      cost: 12000,
      estimatedDays: "2-3 Hari Kerja",
    },
    {
      name: "Jawa Barat (Flat)",
      province: "Jawa Barat",
      city: null,
      cost: 15000,
      estimatedDays: "2-3 Hari Kerja",
    },
    {
      name: "DKI Jakarta & Sekitarnya (Flat)",
      province: "DKI Jakarta",
      city: null,
      cost: 18000,
      estimatedDays: "2-4 Hari Kerja",
    },
    {
      name: "Luar Pulau Jawa (Flat Reguler)",
      province: "Luar Jawa",
      city: null,
      cost: 30000,
      estimatedDays: "3-5 Hari Kerja",
    },
  ];

  for (const sz of shippingZonesData) {
    const existing = await prisma.shippingZone.findFirst({
      where: { name: sz.name },
    });
    if (!existing) {
      await prisma.shippingZone.create({ data: sz });
    }
  }
  console.log(`Seeded shipping zones.`);

  // 7. Pengaturan Sistem (Settings)
  const settingsData = [
    { key: "order_expiry_hours", value: 24 },
    { key: "store_name", value: "SkinSync" },
    { key: "store_cs_phone", value: "628123456789" },
    {
      key: "wa_template:otp_login",
      value: "*SkinSync*\nKode OTP Anda: *{{otp}}*\nBerlaku 5 menit. Jangan bagikan kode ini ke siapapun.",
    },
    {
      key: "wa_template:order_created",
      value: "*SkinSync* - Pesanan Dibuat ✅\nNo. Pesanan: *{{orderNumber}}*\nTotal: *{{total}}*\nBatas Bayar: {{expiresAt}}\n\nBayar di: {{paymentUrl}}",
    },
    {
      key: "wa_template:payment_received",
      value: "*SkinSync* - Pembayaran Diterima 💚\nNo. Pesanan: *{{orderNumber}}*\nTerima kasih! Pesanan Anda sedang kami proses.",
    },
    {
      key: "wa_template:order_shipped",
      value: "*SkinSync* - Pesanan Dikirim 🚚\nNo. Pesanan: *{{orderNumber}}*\nKurir: {{courier}}\nNo. Resi: *{{trackingNumber}}*",
    },
    {
      key: "wa_template:order_expired",
      value: "*SkinSync* - Pesanan Dibatalkan ⚠️\nNo. Pesanan: *{{orderNumber}}*\nPesanan Anda telah dibatalkan karena belum dibayar dalam batas waktu.",
    },
  ];

  for (const s of settingsData) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`Seeded settings.`);

  // 8. Contoh Voucher
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  await prisma.voucher.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: "PERCENT",
      value: 10,
      maxDiscount: 25000,
      minPurchase: 100000,
      quota: 500,
      perUserLimit: 1,
      startsAt: now,
      endsAt: nextMonth,
      isActive: true,
    },
  });

  await prisma.voucher.upsert({
    where: { code: "GRATISONGKIR" },
    update: {},
    create: {
      code: "GRATISONGKIR",
      type: "FREE_SHIPPING",
      value: 0,
      minPurchase: 150000,
      quota: 200,
      perUserLimit: 1,
      startsAt: now,
      endsAt: nextMonth,
      isActive: true,
    },
  });
  console.log(`Seeded vouchers.`);

  // 9. Contoh Produk Awal
  const sampleProducts = [
    {
      name: "Barrier Calm Ceramide Cleanser",
      slug: "barrier-calm-ceramide-cleanser",
      categoryId: categoryMap.get("cleanser")!,
      brandId: brand.id,
      description: "Pembersih wajah bertekstur gel lembut dengan 5 jenis Ceramide dan Panthenol yang membersihkan kotoran tanpa merusak skin barrier alami kulit.",
      ingredients: "Water, Glycerin, Sodium Cocoyl Glycinate, Ceramide NP, Ceramide EOP, Ceramide AP, Panthenol, Hyaluronic Acid, Centella Asiatica Extract.",
      howToUse: "Basahi wajah dengan air, tuang secukupnya pada telapak tangan hingga berbusa halus. Pijat perlahan ke seluruh wajah, lalu bilas hingga bersih.",
      bpomNumber: "NA18231204561",
      avgRating: 4.9,
      reviewCount: 14,
      variants: [
        {
          sku: "CLN-BC-100",
          name: "100 ml",
          price: 89000,
          comparePrice: 109000,
          weightGram: 150,
          stock: 50,
          minStock: 5,
        },
      ],
    },
    {
      name: "Hydra Glow 10% Niacinamide Serum",
      slug: "hydra-glow-10-niacinamide-serum",
      categoryId: categoryMap.get("serum")!,
      brandId: brand.id,
      description: "Serum pencerah konsentrasi tinggi dengan Niacinamide 10%, Alpha Arbutin, dan Zinc PCA untuk menyamarkan noda hitam, meratakan warna kulit, dan mengontrol sebum berlebih.",
      ingredients: "Aqua, Niacinamide 10%, Butylene Glycol, Alpha-Arbutin 2%, Zinc PCA 1%, Sodium Hyaluronate, Allantoin, Phenoxyethanol.",
      howToUse: "Teteskan 2-3 tetes pada wajah yang telah dibersihkan. Tepuk lembut hingga meresap sempurna. Gunakan pagi dan malam hari sebelum pelembap.",
      bpomNumber: "NA18231908922",
      avgRating: 5.0,
      reviewCount: 28,
      variants: [
        {
          sku: "SRM-HG-20",
          name: "20 ml",
          price: 125000,
          comparePrice: 149000,
          weightGram: 80,
          stock: 45,
          minStock: 5,
        },
        {
          sku: "SRM-HG-50",
          name: "50 ml (Jumbo)",
          price: 219000,
          comparePrice: 259000,
          weightGram: 150,
          stock: 25,
          minStock: 5,
        },
      ],
    },
    {
      name: "Water Bank Ultra Moisturizer Gel",
      slug: "water-bank-ultra-moisturizer-gel",
      categoryId: categoryMap.get("moisturizer")!,
      brandId: brand.id,
      description: "Pelembap ringan berbasis air dengan 8 lapisan Hyaluronic Acid dan Squalane yang mengunci hidrasi hingga 72 jam tanpa rasa lengket atau greasy.",
      ingredients: "Water, Dipropylene Glycol, Glycerin, Squalane, 8D Hyaluronic Acid Complex, Betaine, Trehalose, Carbomer, Arginine.",
      howToUse: "Ambil secukupnya dengan ujung jari atau spatula. Oleskan merata ke seluruh wajah dan leher setelah penggunaan serum.",
      bpomNumber: "NA18230107718",
      avgRating: 4.8,
      reviewCount: 9,
      variants: [
        {
          sku: "MST-WB-50",
          name: "50 gr",
          price: 139000,
          comparePrice: 165000,
          weightGram: 120,
          stock: 40,
          minStock: 5,
        },
      ],
    },
    {
      name: "Daily UV Shield Airy Sunscreen SPF 50+ PA++++",
      slug: "daily-uv-shield-airy-sunscreen-spf-50",
      categoryId: categoryMap.get("sunscreen")!,
      brandId: brand.id,
      description: "Sunscreen kimia generasi baru dengan tekstur seringan air, no white cast, cepat meresap, dan dilengkapi anti-blue light serta soothing agent.",
      ingredients: "Aqua, Ethylhexyl Methoxycinnamate, Butyl Methoxydibenzoylmethane, Octocrylene, Niacinamide, Camellia Sinensis Leaf Extract, Silica.",
      howToUse: "Aplikasikan sebanyak dua ruas jari ke seluruh wajah dan leher 15 menit sebelum terpapar sinar matahari. Re-apply setiap 2-3 jam.",
      bpomNumber: "NA18231702334",
      avgRating: 4.9,
      reviewCount: 32,
      variants: [
        {
          sku: "SUN-UV-50",
          name: "50 ml",
          price: 119000,
          comparePrice: 139000,
          weightGram: 100,
          stock: 60,
          minStock: 5,
        },
      ],
    },
  ];

  for (const prod of sampleProducts) {
    const { variants, ...prodData } = prod;
    const createdProduct = await prisma.product.upsert({
      where: { slug: prodData.slug },
      update: prodData,
      create: prodData,
    });

    for (const v of variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          name: v.name,
          price: v.price,
          comparePrice: v.comparePrice,
          weightGram: v.weightGram,
          stock: v.stock,
          minStock: v.minStock,
        },
        create: {
          ...v,
          productId: createdProduct.id,
        },
      });
    }
  }
  console.log(`Seeded sample products with variants.`);

  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
