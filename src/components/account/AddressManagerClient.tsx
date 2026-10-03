// src/components/account/AddressManagerClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

const inputCls =
  "w-full bg-transparent border border-[#070707] px-4 py-3 text-[15px] focus:outline-none focus:bg-white placeholder:text-[#070707]/35 placeholder:italic";
const labelCls = "furniture text-[#070707]/55 block mb-2";

export default function AddressManagerClient({ initialAddresses }: { initialAddresses: Address[] }) {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [showAddForm, setShowAddForm] = useState(initialAddresses.length === 0);
  const [loading, setLoading] = useState(false);
  const [newAddr, setNewAddr] = useState({
    label: "Rumah",
    recipientName: "",
    phone: "",
    province: "DKI Jakarta",
    city: "Jakarta Selatan",
    district: "",
    postalCode: "",
    addressLine: "",
    isDefault: false,
  });

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddr),
      });

      const data = await res.json();
      if (res.ok) {
        setAddresses((prev) => [data.address, ...prev]);
        setShowAddForm(false);
        setNewAddr({
          label: "Rumah",
          recipientName: "",
          phone: "",
          province: "DKI Jakarta",
          city: "Jakarta Selatan",
          district: "",
          postalCode: "",
          addressLine: "",
          isDefault: false,
        });
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <p className="furniture text-[#070707]/50">Daftar tersimpan</p>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className={`furniture px-6 py-3 transition-colors ${
            showAddForm
              ? "border border-[#070707] hover:italic"
              : "bg-[#EF6F79] text-[#070707] hover:bg-[#070707] hover:text-white"
          }`}
        >
          {showAddForm ? "Batal" : "+ Tambah alamat"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddAddress} className="border border-[#070707] p-5 sm:p-8 space-y-5 bg-[#F1F1ED]">
          <p className="furniture">Alamat baru</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Label alamat</label>
              <input
                type="text"
                required
                value={newAddr.label}
                onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                placeholder="Rumah, kantor…"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Nama penerima</label>
              <input
                type="text"
                required
                value={newAddr.recipientName}
                onChange={(e) => setNewAddr({ ...newAddr, recipientName: e.target.value })}
                placeholder="Nama lengkap"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>WhatsApp penerima</label>
              <input
                type="tel"
                required
                value={newAddr.phone}
                onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Provinsi</label>
              <input
                type="text"
                required
                value={newAddr.province}
                onChange={(e) => setNewAddr({ ...newAddr, province: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Kota / kabupaten</label>
              <input
                type="text"
                required
                value={newAddr.city}
                onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Kecamatan &amp; kode pos</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  required
                  placeholder="Kecamatan"
                  value={newAddr.district}
                  onChange={(e) => setNewAddr({ ...newAddr, district: e.target.value })}
                  className={`${inputCls} w-2/3`}
                />
                <input
                  type="text"
                  required
                  placeholder="Kode pos"
                  value={newAddr.postalCode}
                  onChange={(e) => setNewAddr({ ...newAddr, postalCode: e.target.value })}
                  className={`${inputCls} w-1/3`}
                />
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>Alamat lengkap</label>
            <textarea
              required
              rows={2}
              value={newAddr.addressLine}
              onChange={(e) => setNewAddr({ ...newAddr, addressLine: e.target.value })}
              placeholder="Nama jalan, nomor rumah, patokan…"
              className={inputCls}
            />
          </div>
          <label className="flex items-center gap-3 text-[15px] cursor-pointer">
            <input
              type="checkbox"
              id="setDefault"
              checked={newAddr.isDefault}
              onChange={(e) => setNewAddr({ ...newAddr, isDefault: e.target.checked })}
              className="h-4 w-4 accent-[#070707]"
            />
            Jadikan alamat utama
          </label>
          <button
            type="submit"
            disabled={loading}
            className="furniture bg-[#070707] text-white px-6 py-3.5 hover:bg-[#EF6F79] hover:text-[#070707] transition-colors disabled:opacity-40"
          >
            {loading ? "Menyimpan…" : "Simpan alamat"}
          </button>
        </form>
      )}

      {addresses.length === 0 && !showAddForm ? (
        <p className="italic text-[#070707]/60 py-10 border-y border-[#070707]/15 text-center">
          Belum ada alamat tersimpan.
        </p>
      ) : (
        <div className="border-t border-[#070707]">
          {addresses.map((a, i) => (
            <div key={a.id} className="py-5 border-b border-[#070707]/15 flex gap-4">
              <span className="furniture text-[#EF6F79] w-8 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="text-[15px] space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-semibold text-lg">{a.label}</span>
                  {a.isDefault && (
                    <span className="furniture border border-[#070707] px-2 py-0.5">Utama</span>
                  )}
                </div>
                <p className="font-medium">{a.recipientName} <span className="italic text-[#070707]/55">({a.phone})</span></p>
                <p className="italic text-[#070707]/60 leading-relaxed">
                  {a.addressLine}, {a.district}, {a.city}, {a.province} {a.postalCode}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
