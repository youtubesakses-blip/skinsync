// src/components/shop/CheckoutClient.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/money";

interface Address {
  id: number;
  label: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  addressLine: string;
  isDefault: boolean;
}

interface ShippingZone {
  id: number;
  name: string;
  province: string;
  city: string | null;
  cost: number;
  estimatedDays: string | null;
}

interface CartItem {
  id: number;
  qty: number;
  variant: {
    id: number;
    name: string;
    price: number;
    product: {
      name: string;
    };
  };
}

interface CheckoutClientProps {
  initialCart: {
    items: CartItem[];
  };
  initialAddresses: Address[];
  shippingZones: ShippingZone[];
  snapScriptUrl: string;
  clientKey: string;
}

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

export default function CheckoutClient({
  initialCart,
  initialAddresses,
  shippingZones,
  snapScriptUrl,
  clientKey,
}: CheckoutClientProps) {
  const router = useRouter();

  // Load Midtrans Snap script
  useEffect(() => {
    if (!document.getElementById("midtrans-snap-script")) {
      const script = document.createElement("script");
      script.id = "midtrans-snap-script";
      script.src = snapScriptUrl;
      script.setAttribute("data-client-key", clientKey);
      script.async = true;
      document.body.appendChild(script);
    }
  }, [snapScriptUrl, clientKey]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState<number>(
    initialAddresses.find((a) => a.isDefault)?.id || initialAddresses[0]?.id || 0
  );

  // Form tambah alamat baru
  const [showNewAddressModal, setShowNewAddressModal] = useState(initialAddresses.length === 0);
  const [newAddress, setNewAddress] = useState({
    label: "Rumah",
    recipientName: "",
    phone: "",
    province: "DKI Jakarta",
    city: "Jakarta Selatan",
    district: "Kebayoran Baru",
    postalCode: "12110",
    addressLine: "",
  });

  // Step 2 state
  const [selectedZoneId, setSelectedZoneId] = useState<number>(
    shippingZones[0]?.id || 0
  );
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [voucherError, setVoucherError] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const subtotal = initialCart.items.reduce(
    (sum, item) => sum + item.variant.price * item.qty,
    0
  );

  const selectedZone = shippingZones.find((z) => z.id === selectedZoneId) || shippingZones[0];
  const shippingCost = selectedZone ? selectedZone.cost : 0;
  const discountTotal = appliedVoucher ? appliedVoucher.discountAmount : 0;
  const grandTotal = Math.max(0, subtotal - discountTotal + shippingCost);

  // Handle add new address
  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneralError("");

    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });

      const data = await res.json();
      if (!res.ok) {
        setGeneralError(data.error || "Gagal menyimpan alamat");
        return;
      }

      setAddresses((prev) => [data.address, ...prev]);
      setSelectedAddressId(data.address.id);
      setShowNewAddressModal(false);
    } catch {
      setGeneralError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  // Handle voucher validate
  const handleApplyVoucher = async () => {
    if (!voucherCodeInput.trim()) return;
    setVoucherError("");
    setLoading(true);

    try {
      const res = await fetch("/api/vouchers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: voucherCodeInput.trim(),
          subtotal,
          shippingCost,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setVoucherError(data.error || "Voucher tidak dapat digunakan");
        setAppliedVoucher(null);
      } else {
        setAppliedVoucher({
          code: voucherCodeInput.toUpperCase(),
          discountAmount: data.discountAmount,
        });
      }
    } catch {
      setVoucherError("Gagal memeriksa voucher");
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Order & Pay
  const handlePayNow = async () => {
    setGeneralError("");
    setLoading(true);

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: selectedAddressId,
          shippingZoneId: selectedZoneId,
          voucherCode: appliedVoucher ? appliedVoucher.code : undefined,
          customerNote: customerNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGeneralError(data.error || "Gagal membuat pesanan");
        setLoading(false);
        return;
      }

      const { orderNumber, snapToken, redirectUrl } = data;

      // Jika ada Midtrans Snap di window
      if (snapToken && window.snap) {
        window.snap.pay(snapToken, {
          onSuccess: () => {
            router.push(`/account/orders/${orderNumber}?status=success`);
          },
          onPending: () => {
            router.push(`/account/orders/${orderNumber}?status=pending`);
          },
          onError: () => {
            router.push(`/account/orders/${orderNumber}?status=error`);
          },
          onClose: () => {
            router.push(`/account/orders/${orderNumber}`);
          },
        });
      } else if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        router.push(`/account/orders/${orderNumber}`);
      }
    } catch {
      setGeneralError("Terjadi kesalahan saat memproses checkout");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-xs sm:text-sm font-semibold">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`flex items-center gap-2 ${step >= 1 ? "text-indigo-600 font-bold" : "text-gray-400"}`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? "bg-indigo-600 text-white" : "bg-gray-100"}`}>1</span>
          Alamat Pengiriman
        </button>
        <span className="text-gray-300">→</span>
        <button
          type="button"
          disabled={!selectedAddressId}
          onClick={() => setStep(2)}
          className={`flex items-center gap-2 ${step >= 2 ? "text-indigo-600 font-bold" : "text-gray-400"}`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? "bg-indigo-600 text-white" : "bg-gray-100"}`}>2</span>
          Pengiriman & Voucher
        </button>
        <span className="text-gray-300">→</span>
        <button
          type="button"
          disabled={step < 2}
          onClick={() => setStep(3)}
          className={`flex items-center gap-2 ${step === 3 ? "text-indigo-600 font-bold" : "text-gray-400"}`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 3 ? "bg-indigo-600 text-white" : "bg-gray-100"}`}>3</span>
          Konfirmasi & Bayar
        </button>
      </div>

      {generalError && (
        <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-200">
          {generalError}
        </div>
      )}

      {/* STEP 1: Pilih / Tambah Alamat */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-lg font-bold text-gray-900">1. Pilih Alamat Pengiriman</h2>
            <button
              type="button"
              onClick={() => setShowNewAddressModal(!showNewAddressModal)}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              {showNewAddressModal ? "Tutup Form Alamat" : "+ Tambah Alamat Baru"}
            </button>
          </div>

          {/* Form Tambah Alamat */}
          {showNewAddressModal && (
            <form onSubmit={handleCreateAddress} className="p-4 bg-gray-50 rounded-xl space-y-4 border">
              <h3 className="text-sm font-bold text-gray-800">Form Alamat Baru</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Label Alamat</label>
                  <input
                    type="text"
                    required
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    placeholder="Contoh: Rumah, Kantor"
                    className="w-full text-xs p-2.5 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nama Penerima</label>
                  <input
                    type="text"
                    required
                    value={newAddress.recipientName}
                    onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })}
                    placeholder="Nama Lengkap"
                    className="w-full text-xs p-2.5 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nomor WhatsApp Penerima</label>
                  <input
                    type="tel"
                    required
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full text-xs p-2.5 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Provinsi</label>
                  <input
                    type="text"
                    required
                    value={newAddress.province}
                    onChange={(e) => setNewAddress({ ...newAddress, province: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Kota / Kabupaten</label>
                  <input
                    type="text"
                    required
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Kecamatan & Kode Pos</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Kecamatan"
                      value={newAddress.district}
                      onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })}
                      className="w-2/3 text-xs p-2.5 border rounded-lg bg-white"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Kode Pos"
                      value={newAddress.postalCode}
                      onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                      className="w-1/3 text-xs p-2.5 border rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Alamat Lengkap (Jalan, No. Rumah, RT/RW)</label>
                <textarea
                  required
                  rows={2}
                  value={newAddress.addressLine}
                  onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
                  placeholder="Jl. Mawar No. 12, RT 01 / RW 02..."
                  className="w-full text-xs p-2.5 border rounded-lg bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
              >
                {loading ? "Menyimpan..." : "Simpan Alamat Ini"}
              </button>
            </form>
          )}

          {/* Daftar Alamat Tersimpan */}
          <div className="space-y-3">
            {addresses.map((addr) => {
              const isSelected = addr.id === selectedAddressId;
              return (
                <div
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="px-2 py-0.5 rounded bg-gray-200 text-[10px] font-semibold text-gray-700">
                          Utama
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800">
                      {addr.recipientName} ({addr.phone})
                    </p>
                    <p className="text-gray-600">
                      {addr.addressLine}, {addr.district}, {addr.city}, {addr.province} {addr.postalCode}
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="addressSelection"
                    checked={isSelected}
                    onChange={() => setSelectedAddressId(addr.id)}
                    className="mt-1 text-indigo-600"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              type="button"
              disabled={!selectedAddressId}
              onClick={() => setStep(2)}
              className="py-3 px-8 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-40"
            >
              Lanjut ke Pengiriman & Voucher →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Ongkir & Voucher */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-lg font-bold text-gray-900">2. Pilih Zona Pengiriman & Masukkan Voucher</h2>
          </div>

          {/* Pilihan Zona Pengiriman (Flat) */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Pilihan Zona Tarif Flat:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shippingZones.map((z) => {
                const isSelected = z.id === selectedZoneId;
                return (
                  <div
                    key={z.id}
                    onClick={() => setSelectedZoneId(z.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900">{z.name}</p>
                      <p className="text-[11px] text-gray-500">Estimasi: {z.estimatedDays || "2-4 hari"}</p>
                    </div>
                    <span className="text-sm font-bold text-indigo-600">{formatRupiah(z.cost)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kupon / Voucher Diskon */}
          <div className="pt-4 border-t space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Voucher Diskon:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={voucherCodeInput}
                onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                placeholder="Contoh: WELCOME10 atau GRATISONGKIR"
                className="w-full text-xs p-2.5 border rounded-lg uppercase font-mono font-bold bg-white"
              />
              <button
                type="button"
                onClick={handleApplyVoucher}
                disabled={loading || !voucherCodeInput.trim()}
                className="py-2.5 px-5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition disabled:opacity-40"
              >
                Terapkan
              </button>
            </div>
            {voucherError && <p className="text-xs text-red-600">{voucherError}</p>}
            {appliedVoucher && (
              <p className="text-xs text-emerald-600 font-semibold">
                ✓ Voucher {appliedVoucher.code} berhasil dipasang! Hemat {formatRupiah(appliedVoucher.discountAmount)}
              </p>
            )}
          </div>

          {/* Catatan Pembeli */}
          <div className="pt-4 border-t space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Catatan untuk Toko (Opsional):
            </label>
            <input
              type="text"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Contoh: Tolong bungkus ekstra aman, terima kasih!"
              className="w-full text-xs p-2.5 border rounded-lg bg-white"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-semibold text-gray-600 hover:underline"
            >
              ← Kembali ke Alamat
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="py-3 px-8 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition"
            >
              Lanjut ke Konfirmasi →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Ringkasan & Bayar */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-lg font-bold text-gray-900">3. Konfirmasi Pesanan & Pembayaran</h2>
          </div>

          {/* Ringkasan Produk */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Item yang Dibeli:</h3>
            <div className="divide-y divide-gray-100 text-xs">
              {initialCart.items.map((i) => (
                <div key={i.id} className="py-2 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-gray-900">{i.variant.product.name}</span>
                    <span className="text-gray-500"> ({i.variant.name}) x {i.qty}</span>
                  </div>
                  <span className="font-bold text-gray-800">{formatRupiah(i.variant.price * i.qty)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rincian Biaya */}
          <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-xs border">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal Produk</span>
              <span className="font-semibold text-gray-800">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Ongkos Kirim ({selectedZone?.name})</span>
              <span className="font-semibold text-gray-800">{formatRupiah(shippingCost)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Diskon Voucher ({appliedVoucher?.code})</span>
                <span>-{formatRupiah(discountTotal)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between items-baseline text-sm font-extrabold text-gray-900">
              <span>Grand Total</span>
              <span className="text-xl text-indigo-600">{formatRupiah(grandTotal)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs font-semibold text-gray-600 hover:underline"
            >
              ← Ubah Pengiriman
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handlePayNow}
              className="py-3.5 px-8 bg-indigo-600 text-white rounded-xl text-sm font-extrabold hover:bg-indigo-700 transition disabled:opacity-50 shadow-md"
            >
              {loading ? "Memproses Pembayaran..." : `Bayar Sekarang (${formatRupiah(grandTotal)})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
