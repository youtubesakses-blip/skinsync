// src/app/(shop)/page.tsx
// Beranda Aurelle — poster serif, multiply photo, scroll-scrubbed stages, ruled rows.

import { db } from "@/lib/db";
import { imageUrl } from "@/lib/image-url";
import { formatRupiah } from "@/lib/money";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import AurelleChoreo from "@/components/shop/AurelleChoreo";

export const metadata: Metadata = {
  title: "SkinSync — Skincare Terpercaya untuk Semua Jenis Kulit",
  description:
    "Niacinamide 5%, 30 ml. Batch kecil, BPOM RI, untuk kulit Indonesia.",
};

function W({ text }: { text: string }) {
  const parts = text.split(" ");
  return (
    <>
      {parts.map((w, i) => (
        <span key={i} className="w" style={{ ["--i" as string]: i }}>
          {w}
          {i < parts.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

const RITUAL = [
  { no: "01", name: "Cleanse", time: "60 detik, pagi & malam", desc: "Gentle cleanser pH 5.5, tanpa busa berlebih." },
  { no: "02", name: "Serum", time: "90 detik, malam", desc: "Niacinamide 5%, 3–4 tetes ke kulit lembap." },
  { no: "03", name: "Moisturise", time: "60 detik, pagi & malam", desc: "Ceramide + squalane, kunci hidrasi 12 jam." },
  { no: "04", name: "Sunscreen", time: "30 detik, tiap pagi", desc: "SPF 50 PA++++, dua ruas jari." },
];

const FAQS = [
  { q: "Apakah semua produk terdaftar BPOM?", a: "Ya. Nomor registrasi tercantum di setiap halaman produk. Batch 042: NA18241900127." },
  { q: "Berapa lama satu botol habis?", a: "Botol 30 ml untuk pemakaian 3–4 tetes, dua kali sehari, habis dalam 6–8 minggu." },
  { q: "Berapa lama pengiriman?", a: "Jabodetabek 1–2 hari kerja, Pulau Jawa 2–3 hari, luar Jawa 3–5 hari. Resi dikirim via WhatsApp." },
  { q: "Bagaimana cara membayar?", a: "Midtrans: QRIS, virtual account, kartu kredit. Batas pembayaran 24 jam." },
];

export default async function HomePage() {
  const now = new Date();

  const [banners, categories, featuredProducts] = await Promise.all([
    db.banner.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { sortOrder: "asc" },
      take: 5,
    }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 8,
      include: { _count: { select: { products: true } } },
    }),
    db.product.findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { where: { isActive: true }, orderBy: { price: "asc" }, take: 1 },
      },
      orderBy: { avgRating: "desc" },
      take: 6,
    }),
  ]);

  const heroImg = banners[0] ? imageUrl(banners[0].imageKey) : featuredProducts[0]?.images[0] ? imageUrl(featuredProducts[0].images[0].key) : null;
  const heroTitle = banners[0]?.title ?? featuredProducts[0]?.name ?? "Batch No. 042";
  const revealImg = banners[1] ? imageUrl(banners[1].imageKey) : featuredProducts[1]?.images[0] ? imageUrl(featuredProducts[1].images[0].key) : heroImg;
  const stillImg = banners[2] ? imageUrl(banners[2].imageKey) : featuredProducts[2]?.images[0] ? imageUrl(featuredProducts[2].images[0].key) : heroImg;

  return (
    <AurelleChoreo>
      <div className="bg-[#F7F7F4] text-[#070707]">
        {/* ============ 1. HERO — multiply photo, poster wordmark (300svh) ============ */}
        <section className="stage" style={{ height: "300svh" }}>
          <div className="stage-pin bg-[#F7F7F4]">
            {heroImg && (
              <div className="hero-photo absolute inset-0">
                <Image src={heroImg} alt={heroTitle} fill className="object-cover" priority unoptimized />
              </div>
            )}
            <div className="hero-type absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              <span
                className="script-accent text-2xl md:text-3xl mb-4"
                style={{ transform: "rotate(-2deg)" }}
              >
                batch no. 042 — untuk kulit Indonesia
              </span>
              <h1
                className="wordmark"
                style={{ fontSize: "min(clamp(3.5rem, 34vw, 20rem), calc(88vw / (8 * .60)))" }}
              >
                SKINSYNC
              </h1>
              <p className="furniture mt-6 text-[#3b3b38]">
                Niacinamide 5% — 30 ml — BPOM RI
              </p>
            </div>
            <div className="absolute bottom-0 inset-x-0 px-4 sm:px-8 pb-5 pt-10 flex items-end justify-between gap-4 furniture text-[#3b3b38]">
              <span data-rev style={{ ["--d" as string]: "40ms" }}>No. 01 — Pagi &amp; malam</span>
              <span data-rev className="hidden sm:inline" style={{ ["--d" as string]: "80ms" }}>500 botol per batch</span>
              <span data-rev style={{ ["--d" as string]: "120ms" }}> Scroll — 01/03</span>
            </div>
          </div>
        </section>

        {/* ============ 2. REVEAL — bottom-up clip, difference headline (320svh) ============ */}
        <section className="stage" style={{ height: "320svh" }}>
          <div className="stage-pin bg-[#E4E5E0]">
            {revealImg && (
              <div className="reveal-photo absolute inset-0">
                <Image src={revealImg} alt="Rangkaian SkinSync" fill className="object-cover" unoptimized />
              </div>
            )}
            <h2 className="reveal-headline absolute inset-0 flex items-center justify-center text-center px-6 display-tight text-5xl sm:text-7xl md:text-8xl font-medium">
              <span className="rev-words max-w-5xl">
                <W text="Cerah yang tenang," /> <em className="italic font-normal"><W text="bukan yang instan." /></em>
              </span>
            </h2>
            <div className="reveal-caption absolute bottom-0 inset-x-0 px-4 sm:px-8 pb-5 flex items-end justify-between furniture">
              <span className="text-white">Niacinamide 5% — 30 ml</span>
              <span className="hidden sm:inline text-white">Batch 042 — 500 botol</span>
            </div>
          </div>
        </section>

        {/* ============ 3. BLUSH STATEMENT ============ */}
        <section className="bg-[#F3D6DC]">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 md:py-28">
            <p className="furniture mb-6" data-rev>Pernyataan — 01</p>
            <h2 className="display-tight text-4xl sm:text-6xl md:text-7xl font-medium max-w-4xl">
              <span className="rev-words"><W text="Tiga langkah," /> <em className="italic font-normal"><W text="tanpa drama." /></em></span>
            </h2>
            <p className="script-accent text-2xl md:text-3xl mt-6" style={{ transform: "rotate(1.5deg)" }} data-rev>
              dipakai pelan-pelan, setiap hari
            </p>
            <div className="grid sm:grid-cols-3 gap-8 mt-14 pt-10 border-t border-[#070707]">
              {[
                ["Bersihkan", "Gentle cleanser pH 5.5. Satu menit, air suam-suam kuku, tanpa menggesek."],
                ["Perbaiki", "Niacinamide 5% untuk bekas dan pori. Tiga tetes, kulit setengah lembap."],
                ["Lindungi", "Ceramide dan SPF 50 tiap pagi. Dua ruas jari, ulangi bila di luar."],
              ].map(([t, d], i) => (
                <div key={t} data-rev style={{ ["--d" as string]: `${40 + i * 50}ms` }}>
                  <p className="furniture mb-3">0{i + 1} — {t}</p>
                  <p className="italic leading-relaxed text-[15px]">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ INDEKS KATEGORI — ruled rows ============ */}
        {categories.length > 0 && (
          <section className="bg-[#F1F1ED]">
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 md:py-24">
              <div className="flex items-baseline justify-between mb-2" data-rev>
                <p className="furniture">Indeks — kategori</p>
                <Link href="/products" className="furniture underline underline-offset-4">Semua produk</Link>
              </div>
              <div>
                {categories.map((cat, i) => (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    data-rev
                    style={{ ["--d" as string]: `${40 + i * 30}ms` }}
                    className="group flex items-baseline gap-4 sm:gap-8 py-4 border-t border-[#070707] last:border-b"
                  >
                    <span className="furniture text-[#EF6F79] w-8 shrink-0">0{i + 1}</span>
                    <span className="text-2xl sm:text-4xl font-medium tracking-[-0.02em] group-hover:italic transition-all">{cat.name}</span>
                    <span className="ml-auto italic text-sm text-[#070707]/60 whitespace-nowrap">{cat._count.products} produk</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ============ 4. RITUAL — near-black (360svh) ============ */}
        <section className="stage bg-[#070707] text-[#F7F7F4]" data-ritual style={{ height: "360svh" }}>
          <div className="stage-pin bg-[#070707] text-[#F7F7F4]">
            <div className="h-full max-w-7xl mx-auto px-4 sm:px-8 py-20 md:py-0 grid md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="furniture text-[#F7F7F4]/50 mb-6">Ritual — 02</p>
                <h2 className="display-tight text-4xl sm:text-6xl font-medium">
                  Empat menit, <em className="italic font-normal">pagi dan malam.</em>
                </h2>
                <div className="mt-10">
                  {RITUAL.map((s, i) => (
                    <div key={s.no} className="ritual-row flex items-baseline gap-4 sm:gap-6 py-4 border-t border-white/25 last:border-b">
                      <span className="furniture text-[#EF6F79] w-8">{s.no}</span>
                      <span className="text-xl sm:text-2xl font-semibold">{s.name}</span>
                      <span className="ml-auto italic text-sm text-[#F7F7F4]/70 text-right">{s.time}</span>
                    </div>
                  ))}
                  <p className="italic text-sm text-[#F7F7F4]/60 mt-4 max-w-md">{RITUAL[0].desc} Scroll untuk menyalakan tiap baris.</p>
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-[420px]">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#1a1a18]">
                  {stillImg && <Image src={stillImg} alt="Still produk" fill className="ritual-still object-cover" unoptimized />}
                </div>
                <span className="absolute bottom-4 left-4 bg-[#EF6F79] text-white furniture px-4 py-2">
                  Batch 042 — 30 ml
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 5. PAPER — price table ============ */}
        <section id="harga" className="bg-[#F1F1ED]">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 md:py-24">
            <p className="furniture mb-6" data-rev>Harga — 03</p>
            <h2 className="display-tight text-4xl sm:text-6xl font-medium max-w-3xl">
              <span className="rev-words"><W text="Harga jujur," /> <em className="italic font-normal"><W text="isi penuh." /></em></span>
            </h2>
            <div className="mt-12">
              {featuredProducts.map((p, i) => {
                const v = p.variants[0];
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    data-rev
                    style={{ ["--d" as string]: `${40 + i * 30}ms` }}
                    className="group grid grid-cols-[1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-baseline gap-x-6 gap-y-1 py-4 border-t border-[#070707] last:border-b"
                  >
                    <span className="furniture text-[#EF6F79]">0{i + 1}</span>
                    <span>
                      <span className="block text-lg sm:text-xl font-semibold leading-snug group-hover:italic transition-all">{p.name}</span>
                      <span className="block italic text-sm text-[#070707]/60">{p.category?.name ?? "Skincare"} — {v ? `${v.name}` : "satu ukuran"}</span>
                    </span>
                    <span className="text-lg sm:text-xl font-semibold text-[#EF6F79] whitespace-nowrap">
                      {v ? formatRupiah(v.price) : "—"}
                    </span>
                    <span className="hidden sm:inline furniture underline underline-offset-4">Lihat</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6" data-rev>
              <Link
                href="/products"
                className="bg-[#EF6F79] text-white furniture px-8 py-4 hover:bg-[#070707] transition-colors"
              >
                Lihat katalog lengkap
              </Link>
              <span className="script-accent text-2xl" style={{ transform: "rotate(-1.5deg)" }}>
                mulai dari batch kecil saja
              </span>
            </div>
          </div>
        </section>

        {/* ============ TESTIMONI — italic pull quotes ============ */}
        <section className="bg-[#F7F7F4]">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 md:py-24">
            <p className="furniture mb-10" data-rev>Catatan pemakai — 04</p>
            <div className="grid md:grid-cols-3 gap-10">
              {[
                ["Nadia P. — kombinasi, Jakarta", "Dua minggu, bekas memudar. Teksturnya ringan, tidak lengket."],
                ["Salsa B. — sensitif, Bandung", "Kulitku rewel, tapi tidak perih sama sekali. Kemasannya rapi."],
                ["Rina A. — kering, Surabaya", "Pagi hari kulit masih lembap. Resi dikirim cepat via WhatsApp."],
              ].map(([who, quote], i) => (
                <figure key={who} data-rev style={{ ["--d" as string]: `${40 + i * 50}ms` }}>
                  <div className="border-t border-[#070707] pt-6">
                    <blockquote className="italic text-xl leading-snug">“{quote}”</blockquote>
                    <figcaption className="furniture mt-4 text-[#070707]/60">{who}</figcaption>
                  </div>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ============ 6. BLUSH FAQ ============ */}
        <section className="bg-[#F5D9DF]">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-16 md:py-24">
            <p className="furniture mb-6" data-rev>FAQ — 05</p>
            <h2 className="display-tight text-4xl sm:text-5xl font-medium mb-10">
              <span className="rev-words"><W text="Yang sering" /> <em className="italic font-normal"><W text="ditanyakan." /></em></span>
            </h2>
            <div data-rev>
              {FAQS.map((f) => (
                <details key={f.q} className="faq-row">
                  <summary>
                    <span className="text-lg font-semibold">{f.q}</span>
                  </summary>
                  <p className="faq-a italic text-[15px] leading-relaxed text-[#070707]/75">{f.a}</p>
                </details>
              ))}
            </div>
            <div className="mt-10 furniture flex flex-wrap gap-x-8 gap-y-2" data-rev>
              <span>CS — Senin–Sabtu</span>
              <span>09.00–18.00 WIB</span>
              <Link href="/faq" className="underline underline-offset-4">Halaman FAQ</Link>
            </div>
          </div>
        </section>
      </div>
    </AurelleChoreo>
  );
}
