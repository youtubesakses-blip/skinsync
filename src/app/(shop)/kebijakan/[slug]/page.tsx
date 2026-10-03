// src/app/(shop)/kebijakan/[slug]/page.tsx
// Halaman kebijakan statis (privasi, pengiriman, retur)

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

interface PolicyPageProps {
  params: Promise<{ slug: string }>;
}

const POLICIES: Record<
  string,
  { title: string; lastUpdated: string; content: { heading: string; body: string }[] }
> = {
  privasi: {
    title: "Kebijakan Privasi",
    lastUpdated: "1 Oktober 2026",
    content: [
      {
        heading: "1. Data yang Kami Kumpulkan",
        body: "Kami mengumpulkan nomor telepon WhatsApp untuk keperluan autentikasi melalui One-Time Password (OTP), nama lengkap penerima, serta alamat lengkap pengiriman paket yang Anda berikan.",
      },
      {
        heading: "2. Penggunaan Informasi Anda",
        body: "Informasi kontak dan pengiriman Anda hanya digunakan semata-mata untuk memproses transaksi pesanan, memverifikasi akun, mengirimkan notifikasi status pesanan & nomor resi pengiriman melalui WhatsApp resmi SkinSync, dan tidak akan pernah dijual kepada pihak ketiga mana pun.",
      },
      {
        heading: "3. Keamanan Data",
        body: "Setiap sesi pengguna diamankan dengan cookie httpOnly terenkripsi JWT. Kata sandi tidak disimpan di server kami karena kami sepenuhnya menggunakan sistem otentikasi kata sandi sekali pakai (OTP) yang kadaluarsa dalam 5 menit.",
      },
    ],
  },
  pengiriman: {
    title: "Kebijakan Pengiriman",
    lastUpdated: "1 Oktober 2026",
    content: [
      {
        heading: "1. Tarif Flat Per Zona",
        body: "SkinSync memberlakukan skema tarif flat ongkos kirim berdasarkan zona wilayah tujuan pengiriman yang ditentukan oleh admin. Tidak ada penambahan biaya dimensi tersembunyi.",
      },
      {
        heading: "2. Waktu Pemrosesan Pesanan",
        body: "Pesanan yang telah berstatus PAID akan diproses dan dikemas dalam kurun waktu 1x24 jam kerja (tidak termasuk hari Minggu dan hari libur nasional).",
      },
      {
        heading: "3. Nomor Resi & Pelacakan",
        body: "Segera setelah kurir mengambil paket dan nomor resi diinput oleh admin kami, sistem akan secara otomatis mengirimkan pesan WhatsApp ke nomor Anda yang berisi nama kurir dan nomor resi pengiriman untuk kemudahan pelacakan.",
      },
    ],
  },
  retur: {
    title: "Kebijakan Retur & Pembatalan",
    lastUpdated: "1 Oktober 2026",
    content: [
      {
        heading: "1. Pembatalan Otomatis",
        body: "Pesanan yang berstatus PENDING_PAYMENT yang tidak diselesaikan pembayarannya dalam waktu 24 jam akan secara otomatis dibatalkan oleh sistem kami (EXPIRED).",
      },
      {
        heading: "2. Kerusakan Saat Pengiriman",
        body: "Kami memastikan seluruh produk dikemas aman dengan bubble wrap ganda. Apabila produk yang Anda terima mengalami kerusakan fisik atau kebocoran akibat proses pengiriman, silakan segera hubungi Customer Service kami via WhatsApp dengan menyertakan video unboxing tanpa jeda.",
      },
    ],
  },
};

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) return { title: "Kebijakan — SkinSync" };
  return { title: `${policy.title} — SkinSync` };
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { slug } = await params;
  const policy = POLICIES[slug];

  if (!policy) {
    notFound();
  }

  return (
    <div className="bg-[#F7F7F4] text-[#070707]">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-24 pb-20">
        <p className="furniture text-[#070707]/50 mb-4">
          <Link href="/" className="hover:italic">Beranda</Link>
          <span className="mx-2">/</span>
          <span className="text-[#070707]">Kebijakan</span>
        </p>
        <h1 className="display-tight text-5xl sm:text-6xl font-medium">{policy.title}</h1>
        <p className="italic text-sm text-[#070707]/50 mt-3">Terakhir diperbarui — {policy.lastUpdated}</p>

        <div className="mt-10 border-t border-[#070707]">
          {policy.content.map((sec, idx) => (
            <div key={idx} className="py-6 border-b border-[#070707]/20 grid sm:grid-cols-[80px_1fr] gap-3">
              <span className="furniture text-[#EF6F79]">0{idx + 1}</span>
              <div>
                <h2 className="text-xl font-medium">{sec.heading}</h2>
                <p className="italic text-[15px] text-[#070707]/70 leading-relaxed mt-2 max-w-2xl">{sec.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
