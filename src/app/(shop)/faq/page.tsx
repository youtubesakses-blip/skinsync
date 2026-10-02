// src/app/(shop)/faq/page.tsx
// Halaman FAQ statis

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pertanyaan yang Sering Diajukan (FAQ) — SkinSync",
  description: "Temukan jawaban seputar produk, pemesanan, pengiriman, dan pembayaran di SkinSync.",
};

export default function FaqPage() {
  const faqs = [
    {
      q: "Bagaimana cara melakukan pemesanan di SkinSync?",
      a: "Anda cukup login menggunakan nomor WhatsApp Anda dengan verifikasi OTP. Pilih produk yang diinginkan, tambahkan ke keranjang, isi atau pilih alamat pengiriman, dan lakukan pembayaran melalui Midtrans.",
    },
    {
      q: "Apakah semua produk di SkinSync terdaftar BPOM?",
      a: "Ya, 100% produk yang dijual di SkinSync telah lolos uji klinis dan memiliki nomor registrasi resmi dari BPOM RI. Nomor BPOM selalu tercantum di setiap halaman detail produk.",
    },
    {
      q: "Bagaimana cara kerja pembayaran?",
      a: "Kami menggunakan Midtrans Snap yang mendukung berbagai metode pembayaran seperti QRIS (GoPay, OVO, ShopeePay, Dana), Virtual Account (BCA, Mandiri, BNI, BRI), dan Kartu Kredit. Batas waktu pembayaran adalah 24 jam setelah pesanan dibuat.",
    },
    {
      q: "Berapa lama estimasi pengiriman pesanan saya?",
      a: "Estimasi pengiriman flat tergantung zona Anda: Jabodetabek 1-2 hari kerja, Pulau Jawa 2-3 hari kerja, dan Luar Pulau Jawa 3-5 hari kerja. Nomor resi pengiriman akan otomatis dikirimkan ke WhatsApp Anda setelah admin menginput resi.",
    },
    {
      q: "Mengapa saya tidak menerima kode OTP di WhatsApp?",
      a: "Pastikan nomor HP yang Anda masukkan aktif di WhatsApp dan sinyal internet Anda stabil. Jika dalam 60 detik belum menerima OTP, Anda dapat mengklik tombol 'Kirim ulang OTP' di halaman login.",
    },
    {
      q: "Bagaimana jika pesanan saya kedaluwarsa?",
      a: "Pesanan yang tidak diselesaikan pembayarannya dalam waktu 24 jam akan otomatis dibatalkan oleh sistem, dan stok produk serta kuota voucher (jika digunakan) akan dikembalikan ke sistem.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-gray-900">Pertanyaan yang Sering Diajukan</h1>
        <p className="text-gray-500 text-sm">
          Semua informasi yang perlu Anda ketahui tentang layanan SkinSync
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <h2 className="text-base font-bold text-gray-900 flex items-start gap-2">
              <span className="text-indigo-600 font-extrabold">Q:</span> {faq.q}
            </h2>
            <p className="text-sm text-gray-600 pl-6 leading-relaxed">
              {faq.a}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center space-y-3">
        <h3 className="font-bold text-indigo-900">Masih memiliki pertanyaan lain?</h3>
        <p className="text-xs text-indigo-700">
          Tim Customer Service kami siap membantu Anda setiap hari pukul 09.00 - 21.00 WIB.
        </p>
        <a
          href="https://wa.me/628123456789?text=Halo%20SkinSync%2C%20saya%20memiliki%20pertanyaan"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block py-2.5 px-6 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition"
        >
          Hubungi Kami via WhatsApp
        </a>
      </div>
    </div>
  );
}
