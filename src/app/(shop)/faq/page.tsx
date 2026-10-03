// src/app/(shop)/faq/page.tsx
// FAQ Aurelle — blush band, native details rows.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pertanyaan yang Sering Diajukan (FAQ) — SkinSync",
  description: "Pemesanan, BPOM, pembayaran, pengiriman.",
};

const FAQS = [
  {
    q: "Bagaimana cara memesan?",
    a: "Masuk dengan nomor WhatsApp dan verifikasi OTP. Pilih produk, tambah ke keranjang, isi alamat, bayar via Midtrans.",
  },
  {
    q: "Apakah produk terdaftar BPOM?",
    a: "Ya, 100% produk memiliki nomor registrasi BPOM RI yang tercantum di setiap halaman produk.",
  },
  {
    q: "Bagaimana cara membayar?",
    a: "Midtrans Snap: QRIS, virtual account (BCA, Mandiri, BNI, BRI), kartu kredit. Batas pembayaran 24 jam.",
  },
  {
    q: "Berapa lama pengiriman?",
    a: "Jabodetabek 1–2 hari kerja, Pulau Jawa 2–3 hari, luar Jawa 3–5 hari. Resi dikirim otomatis via WhatsApp.",
  },
  {
    q: "Mengapa OTP tidak masuk?",
    a: "Pastikan nomor aktif di WhatsApp dan koneksi stabil. Jika 60 detik belum masuk, kirim ulang OTP.",
  },
  {
    q: "Bagaimana jika pesanan kedaluwarsa?",
    a: "Pesanan tanpa pembayaran dalam 24 jam otomatis dibatalkan; stok dan kuota voucher dikembalikan.",
  },
];

export default function FaqPage() {
  return (
    <div className="bg-[#F5D9DF] text-[#070707]">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-24 pb-20">
        <p className="furniture text-[#070707]/50 mb-4">
          <Link href="/" className="hover:italic">Beranda</Link>
          <span className="mx-2">/</span>
          <span className="text-[#070707]">FAQ</span>
        </p>
        <h1 className="display-tight text-5xl sm:text-7xl font-medium">
          Yang sering <em className="italic font-normal">ditanyakan.</em>
        </h1>
        <p className="italic text-[#070707]/60 mt-4">Pemesanan, pembayaran, pengiriman — ringkas.</p>

        <div className="mt-12">
          {FAQS.map((f) => (
            <details key={f.q} className="faq-row">
              <summary>
                <span className="text-lg sm:text-xl font-medium">{f.q}</span>
              </summary>
              <p className="faq-a italic text-[15px] leading-relaxed text-[#070707]/75">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 furniture flex flex-wrap gap-x-8 gap-y-2 border-t border-[#070707] pt-6">
          <span>CS — Senin–Sabtu</span>
          <span>09.00–18.00 WIB</span>
          <a href="https://wa.me/628123456789?text=Halo%20SkinSync" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
