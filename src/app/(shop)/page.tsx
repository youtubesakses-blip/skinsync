// src/app/(shop)/page.tsx
// Beranda: hero eye-catching + kategori + produk unggulan + testimoni + CTA

import { db } from "@/lib/db";
import { imageUrl } from "@/lib/image-url";
import { formatRupiah } from "@/lib/money";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SkinSync — Skincare Terpercaya untuk Semua Jenis Kulit",
  description:
    "Temukan produk skincare premium, BPOM, dan cocok untuk kulitmu. Gratis ongkir, pembayaran aman, pengiriman cepat.",
};

const TRUST_ITEMS = [
  "✓ 100% BPOM Resmi",
  "✓ Dermatologist Tested",
  "✓ Cruelty Free",
  "✓ Formula Aman Ibu Hamil",
  "✓ 50.000+ Pelanggan Puas",
  "✓ Pengiriman Cepat",
];

const TESTIMONIALS = [
  {
    name: "Nadia Prameswari",
    role: "Kulit Kombinasi · Jakarta",
    text: "Baru 2 minggu pakai, bekas jerawat memudar banget. Teksturnya ringan, nggak lengket sama sekali!",
    rating: 5,
    initial: "N",
    color: "from-rose-400 to-orange-400",
  },
  {
    name: "Salsa Bilqis",
    role: "Kulit Sensitif · Bandung",
    text: "Kulitku super rewel, tapi rangkaian SkinSync nggak bikin perih. Kemasannya juga mewah banget.",
    rating: 5,
    initial: "S",
    color: "from-violet-400 to-fuchsia-400",
  },
  {
    name: "Rina Amelia",
    role: "Kulit Kering · Surabaya",
    text: "Pagi-pagi kulit masih lembap dan plumpy. CS-nya fast respon via WA, pengiriman juga cepat!",
    rating: 5,
    initial: "R",
    color: "from-amber-400 to-orange-500",
  },
];

const RITUAL_STEPS = [
  {
    no: "01",
    title: "Cleanse",
    desc: "Bersihkan wajah dengan gentle cleanser pH seimbang.",
    emoji: "🧼",
  },
  {
    no: "02",
    title: "Treat",
    desc: "Aplikasikan serum sesuai masalah kulitmu.",
    emoji: "💧",
  },
  {
    no: "03",
    title: "Protect",
    desc: "Kunci kelembapan + sunscreen tiap pagi.",
    emoji: "☀️",
  },
];

const CATEGORY_EMOJI = ["🧴", "💧", "✨", "🌿", "🧪", "💆‍♀️", "☀️", "🌙"];

export default async function HomePage() {
  const now = new Date();

  const banners = await db.banner.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { sortOrder: "asc" },
    take: 5,
  });

  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 8,
  });

  const featuredProducts = await db.product.findMany({
    where: { isActive: true, deletedAt: null },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: {
        where: { isActive: true },
        orderBy: { price: "asc" },
        take: 1,
      },
    },
    orderBy: { avgRating: "desc" },
    take: 8,
  });

  const heroBanner = banners[0];

  return (
    <div className="bg-[#fff8f3]">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        {/* mesh gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-orange-200 via-rose-200 to-fuchsia-200 blur-3xl opacity-70" />
          <div className="absolute top-10 right-[-120px] w-[520px] h-[520px] rounded-full bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 blur-3xl opacity-80" />
          <div className="absolute bottom-[-160px] left-1/3 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-violet-200 to-rose-100 blur-3xl opacity-50" />
          <div className="absolute inset-0 texture-dots opacity-60" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-16 pb-12 md:pb-20 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Left copy */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-[#2a1220]/10 rounded-full pl-1.5 pr-4 py-1.5 shadow-sm mb-5">
              <span className="bg-gradient-to-r from-[#f4733d] to-[#e14b7a] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full tracking-wide">
                BARU
              </span>
              <span className="text-[13px] font-semibold text-[#2a1220]/80">
                Brightening Series — cerah dalam 14 hari ✨
              </span>
            </div>

            <h1 className="text-[42px] leading-[1.02] sm:text-6xl lg:text-[68px] font-black tracking-tight text-[#2a1220]">
              Kulit{" "}
              <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#f4733d] via-[#e14b7a] to-[#7c3aed]">
                Glowing
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                >
                  <path
                    d="M2 9C60 3 140 3 198 9"
                    stroke="#f4733d"
                    strokeWidth="5"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                </svg>
              </span>{" "}
              dimulai dari sini.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-[#2a1220]/65 max-w-lg leading-relaxed">
              Skincare BPOM dengan bahan aktif klinis — diformulasikan untuk
              kulit Indonesia. Tanpa merkuri, tanpa janji palsu.{" "}
              <span className="font-bold text-[#2a1220]">
                50.000+ perempuan
              </span>{" "}
              sudah membuktikannya.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/products"
                className="group inline-flex items-center gap-2 bg-[#2a1220] text-white font-bold px-7 py-3.5 rounded-full hover:bg-[#f4733d] transition-all shadow-xl shadow-[#2a1220]/25 hover:shadow-orange-500/30 hover:-translate-y-0.5"
              >
                Belanja Sekarang
                <span className="group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </Link>
              <Link
                href="#best-seller"
                className="inline-flex items-center gap-2 bg-white/80 backdrop-blur font-bold px-7 py-3.5 rounded-full border border-[#2a1220]/15 text-[#2a1220] hover:border-[#f4733d] hover:text-[#f4733d] transition-all"
              >
                ▶ Lihat Best Seller
              </Link>
            </div>

            {/* stats + avatars */}
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  {["N", "S", "R", "+"].map((t, i) => (
                    <span
                      key={i}
                      className={`w-9 h-9 rounded-full grid place-items-center text-xs font-extrabold text-white border-2 border-[#fff8f3] shadow ${
                        i === 3
                          ? "bg-[#2a1220]"
                          : `bg-gradient-to-br ${TESTIMONIALS[i % 3].color}`
                      }`}
                    >
                      {t === "+" ? "50k" : t}
                    </span>
                  ))}
                </div>
                <div className="text-[13px] leading-tight">
                  <div className="text-amber-500 font-bold tracking-wide">
                    ★★★★★ <span className="text-[#2a1220]">4.9/5</span>
                  </div>
                  <div className="text-[#2a1220]/60 font-medium">
                    dari 12.400+ ulasan
                  </div>
                </div>
              </div>
              <div className="hidden sm:block w-px h-10 bg-[#2a1220]/10" />
              <div className="flex gap-6 text-[13px]">
                <div>
                  <p className="text-lg font-black text-[#2a1220]">100%</p>
                  <p className="text-[#2a1220]/60 font-medium">BPOM Resmi</p>
                </div>
                <div>
                  <p className="text-lg font-black text-[#2a1220]">24 Jam</p>
                  <p className="text-[#2a1220]/60 font-medium">Pengiriman</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right visual */}
          <div className="relative mx-auto w-full max-w-[480px] animate-fade-up">
            <div className="relative rounded-[32px] overflow-hidden shadow-2xl shadow-rose-500/20 border-[6px] border-white rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="relative aspect-[4/5] bg-gradient-to-br from-orange-100 to-rose-100">
                {heroBanner ? (
                  <Image
                    src={imageUrl(heroBanner.imageKey)}
                    alt={heroBanner.title}
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                  />
                ) : featuredProducts[0]?.images[0] ? (
                  <Image
                    src={imageUrl(featuredProducts[0].images[0].key)}
                    alt={featuredProducts[0].name}
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-8xl">
                    🧴
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#2a1220]/50 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div className="text-white">
                    <p className="text-[11px] font-bold tracking-[0.2em] uppercase opacity-80">
                      Best Seller
                    </p>
                    <p className="font-extrabold text-lg leading-tight">
                      {heroBanner?.title ?? featuredProducts[0]?.name ?? "Glow Series"}
                    </p>
                  </div>
                  <Link
                    href="/products"
                    className="bg-white text-[#2a1220] text-sm font-bold px-4 py-2 rounded-full hover:bg-[#f4733d] hover:text-white transition whitespace-nowrap"
                  >
                    Shop →
                  </Link>
                </div>
              </div>
            </div>

            {/* floating cards */}
            <div className="absolute -left-4 sm:-left-10 top-8 bg-white/90 backdrop-blur rounded-2xl shadow-xl shadow-orange-500/10 border border-white px-4 py-3 flex items-center gap-3 animate-float">
              <span className="w-10 h-10 rounded-xl bg-green-100 grid place-items-center text-xl">
                🛡️
              </span>
              <div>
                <p className="text-[13px] font-extrabold text-[#2a1220]">
                  BPOM Certified
                </p>
                <p className="text-[11px] text-[#2a1220]/60 font-medium">
                  Aman & teruji klinis
                </p>
              </div>
            </div>
            <div className="absolute -right-3 sm:-right-8 bottom-16 bg-white/90 backdrop-blur rounded-2xl shadow-xl shadow-rose-500/10 border border-white px-4 py-3 flex items-center gap-3 animate-float-slow">
              <span className="w-10 h-10 rounded-xl bg-amber-100 grid place-items-center text-xl">
                🚚
              </span>
              <div>
                <p className="text-[13px] font-extrabold text-[#2a1220]">
                  Gratis Ongkir
                </p>
                <p className="text-[11px] text-[#2a1220]/60 font-medium">
                  Min. belanja Rp150rb
                </p>
              </div>
            </div>
            <div className="absolute -bottom-5 left-8 bg-[#2a1220] text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 rotate-[-2deg]">
              <span className="text-2xl">💬</span>
              <div>
                <p className="text-[13px] font-extrabold">Konsultasi Gratis</p>
                <p className="text-[11px] text-white/60 font-medium">
                  via WhatsApp CS
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* marquee */}
        <div className="bg-[#2a1220] py-3.5 overflow-hidden -rotate-1 scale-[1.02] shadow-lg">
          <div className="flex w-max animate-marquee gap-0">
            {[...TRUST_ITEMS, ...TRUST_ITEMS].map((item, i) => (
              <span
                key={i}
                className="text-white/90 text-sm font-bold tracking-wide px-6 whitespace-nowrap"
              >
                {item} <span className="ml-6 text-[#f4733d]">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ KATEGORI ============ */}
      {categories.length > 0 && (
        <section id="kategori" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-20">
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-[12px] font-extrabold tracking-[0.22em] uppercase text-[#f4733d] mb-2">
                ✦ Shop by category
              </p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#2a1220]">
                Mau rawat apa hari ini?
              </h2>
            </div>
            <Link
              href="/products"
              className="hidden sm:inline-flex text-sm font-bold text-[#2a1220] hover:text-[#f4733d] transition"
            >
              Lihat semua →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.map((cat, i) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group bg-white rounded-3xl border border-[#2a1220]/8 p-4 text-center shadow-sm hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1.5 hover:border-[#f4733d]/40 transition-all duration-300"
              >
                <span className="mx-auto w-12 h-12 rounded-2xl grid place-items-center text-2xl mb-2.5 bg-gradient-to-br from-[#fef3ee] to-[#fde7db] group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  {CATEGORY_EMOJI[i % CATEGORY_EMOJI.length]}
                </span>
                <span className="block text-[13px] font-bold text-[#2a1220] leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============ PRODUK UNGGULAN ============ */}
      <section id="best-seller" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-20">
        <div className="relative overflow-hidden rounded-[32px] bg-[#2a1220] px-6 sm:px-10 py-10 sm:py-12 mb-8">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#f4733d]/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-[#7c3aed]/30 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-[12px] font-extrabold tracking-[0.22em] uppercase text-amber-300 mb-2">
                🔥 Paling laris minggu ini
              </p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Best Seller yang selalu restock
              </h2>
              <p className="text-white/60 mt-2 font-medium">
                Rating tertinggi dari ribuan pembeli terverifikasi.
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-white text-[#2a1220] font-bold px-6 py-3 rounded-full hover:bg-[#f4733d] hover:text-white transition-all shadow-lg"
            >
              Lihat semua produk →
            </Link>
          </div>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="text-center py-16 text-[#2a1220]/40 bg-white rounded-3xl border border-dashed border-[#2a1220]/20">
            Belum ada produk tersedia.
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.map((product, idx) => {
              const firstVariant = product.variants[0];
              const firstImage = product.images[0];
              const discount = firstVariant?.comparePrice
                ? Math.round(
                    ((firstVariant.comparePrice - firstVariant.price) /
                      firstVariant.comparePrice) *
                      100
                  )
                : 0;

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group bg-white rounded-[24px] border border-[#2a1220]/8 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-orange-500/15 hover:-translate-y-1.5 transition-all duration-300"
                >
                  <div className="relative aspect-square bg-gradient-to-br from-[#fef3ee] to-[#fde7db] overflow-hidden">
                    {firstImage ? (
                      <Image
                        src={imageUrl(firstImage.key)}
                        alt={firstImage.altText ?? product.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-6xl">
                        🧴
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      {idx < 3 && (
                        <span className="bg-[#2a1220] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full">
                          #{idx + 1} BEST SELLER
                        </span>
                      )}
                      {discount > 0 && (
                        <span className="bg-[#f4733d] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full w-fit">
                          -{discount}%
                        </span>
                      )}
                    </div>
                    <div className="absolute inset-x-3 bottom-3 translate-y-14 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <span className="block text-center bg-[#2a1220]/90 backdrop-blur text-white text-[13px] font-bold py-2.5 rounded-full">
                        Lihat Detail →
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] font-bold tracking-wider uppercase text-[#f4733d] mb-1 truncate">
                      {product.category?.name ?? "Skincare"}
                    </p>
                    <h3 className="text-sm font-bold text-[#2a1220] line-clamp-2 mb-2 min-h-[40px] leading-snug">
                      {product.name}
                    </h3>
                    {firstVariant && (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[15px] font-black text-[#2a1220]">
                          {formatRupiah(firstVariant.price)}
                        </span>
                        {firstVariant.comparePrice && (
                          <span className="text-xs text-[#2a1220]/40 line-through font-medium">
                            {formatRupiah(firstVariant.comparePrice)}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-amber-400 text-sm">★</span>
                      <span className="text-xs font-bold text-[#2a1220]">
                        {product.reviewCount > 0
                          ? product.avgRating.toFixed(1)
                          : "Baru"}
                      </span>
                      <span className="text-xs text-[#2a1220]/50 font-medium">
                        ({product.reviewCount} ulasan)
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ============ RITUAL ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-20">
        <div className="grid md:grid-cols-3 gap-4">
          {RITUAL_STEPS.map((s) => (
            <div
              key={s.no}
              className="relative bg-white rounded-[28px] border border-[#2a1220]/8 p-7 overflow-hidden hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all group"
            >
              <span className="absolute -top-2 right-4 text-[72px] font-black text-[#fde7db] group-hover:text-[#f4733d]/20 transition-colors select-none">
                {s.no}
              </span>
              <span className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fef3ee] to-[#fde7db] grid place-items-center text-2xl mb-4">
                {s.emoji}
              </span>
              <h3 className="relative text-xl font-black text-[#2a1220]">
                {s.title}
              </h3>
              <p className="relative text-sm text-[#2a1220]/60 font-medium mt-1.5 leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ SKIN QUIZ CTA ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-20">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#f4733d] via-[#e14b7a] to-[#7c3aed] p-8 sm:p-12 text-white shadow-2xl shadow-rose-500/25">
          <div className="absolute inset-0 texture-dots opacity-20" />
          <div className="absolute -top-16 -right-16 text-[200px] opacity-15 select-none rotate-12">
            ✨
          </div>
          <div className="relative grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-[12px] font-extrabold tracking-[0.22em] uppercase text-white/80 mb-3">
                🤍 Bingung mulai dari mana?
              </p>
              <h2 className="text-3xl sm:text-[40px] leading-tight font-black tracking-tight">
                Temukan skincare yang cocok untuk kulitmu dalam 1 menit.
              </h2>
              <p className="mt-3 text-white/80 font-medium max-w-md">
                Isi profil kulit di akunmu — jenis kulit & alergi — biar
                rekomendasi produk makin pas.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/account"
                  className="bg-white text-[#2a1220] font-bold px-7 py-3.5 rounded-full hover:bg-[#2a1220] hover:text-white transition-all shadow-lg"
                >
                  Isi Profil Kulit →
                </Link>
                <Link
                  href="/products"
                  className="border-2 border-white/40 text-white font-bold px-7 py-3 rounded-full hover:bg-white/10 transition-all"
                >
                  Jelajahi Katalog
                </Link>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-3">
              {[
                ["Berminyak", "💧 Oil control"],
                ["Kering", "🧴 Extra moist"],
                ["Sensitif", "🌿 Calming"],
                ["Berjerawat", "✨ Acne care"],
              ].map(([t, d]) => (
                <div
                  key={t}
                  className="bg-white/15 backdrop-blur border border-white/25 rounded-3xl p-5 hover:bg-white/25 transition"
                >
                  <p className="font-extrabold text-lg">{t}</p>
                  <p className="text-white/75 text-sm font-medium">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ TESTIMONI ============ */}
      <section id="testimoni" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-20">
        <div className="text-center mb-8">
          <p className="text-[12px] font-extrabold tracking-[0.22em] uppercase text-[#f4733d] mb-2">
            ★ Kata mereka
          </p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#2a1220]">
            50.000+ kulit bahagia
          </h2>
          <p className="text-[#2a1220]/60 font-medium mt-2">
            Ulasan jujur dari pembeli terverifikasi.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="bg-white rounded-[28px] border border-[#2a1220]/8 p-7 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all"
            >
              <div className="text-amber-400 tracking-widest mb-3">★★★★★</div>
              <blockquote className="text-[15px] leading-relaxed text-[#2a1220]/80 font-medium">
                “{t.text}”
              </blockquote>
              <figcaption className="flex items-center gap-3 mt-6">
                <span
                  className={`w-11 h-11 rounded-full grid place-items-center text-white font-extrabold bg-gradient-to-br ${t.color} shadow`}
                >
                  {t.initial}
                </span>
                <div>
                  <p className="text-sm font-extrabold text-[#2a1220]">
                    {t.name}
                  </p>
                  <p className="text-xs text-[#2a1220]/55 font-medium">
                    {t.role} · Pembeli Terverifikasi ✓
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ============ CTA AKHIR ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="relative overflow-hidden rounded-[32px] bg-[#2a1220] px-8 py-12 sm:p-14 text-center">
          <div className="absolute -top-24 left-1/4 w-80 h-80 rounded-full bg-[#f4733d]/25 blur-3xl" />
          <div className="absolute -bottom-24 right-1/4 w-80 h-80 rounded-full bg-[#7c3aed]/25 blur-3xl" />
          <p className="relative text-5xl mb-4">💌</p>
          <h2 className="relative text-3xl sm:text-4xl font-black tracking-tight text-white max-w-2xl mx-auto leading-tight">
            Siap punya kulit sehat impianmu?
          </h2>
          <p className="relative text-white/60 font-medium mt-3 max-w-xl mx-auto">
            Daftar dengan nomor WhatsApp — tanpa password, tanpa ribet.
            Checkout aman dengan Midtrans.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="bg-gradient-to-r from-[#f4733d] to-[#e14b7a] text-white font-bold px-8 py-3.5 rounded-full hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-xl shadow-orange-500/30"
            >
              Daftar / Masuk Sekarang ✨
            </Link>
            <Link
              href="/faq"
              className="text-white font-bold px-8 py-3.5 rounded-full border border-white/20 hover:bg-white/10 transition-all"
            >
              Baca FAQ
            </Link>
          </div>
          <p className="relative text-white/40 text-xs font-medium mt-6">
            🔒 Pembayaran aman · 📦 Garansi produk sampai · 💬 CS siap membantu
          </p>
        </div>
      </section>
    </div>
  );
}
