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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <div className="text-sm text-gray-500 mb-2">
          <Link href="/" className="hover:text-indigo-600">Beranda</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">Kebijakan</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">{policy.title}</h1>
        <p className="text-xs text-gray-400 mt-1">Terakhir diperbarui: {policy.lastUpdated}</p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        {policy.content.map((sec, idx) => (
          <div key={idx} className="space-y-2">
            <h2 className="text-base font-bold text-gray-900">{sec.heading}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{sec.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
