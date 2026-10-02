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
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
        >
          {showAddForm ? "Batal" : "+ Tambah Alamat Baru"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddAddress} className="p-5 bg-gray-50 rounded-2xl border space-y-4">
          <h2 className="text-sm font-bold text-gray-900">Form Alamat Pengiriman Baru</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Label Alamat</label>
              <input
                type="text"
                required
                value={newAddr.label}
                onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                placeholder="Contoh: Rumah, Kantor"
                className="w-full p-2.5 border rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Nama Penerima</label>
              <input
                type="text"
                required
                value={newAddr.recipientName}
                onChange={(e) => setNewAddr({ ...newAddr, recipientName: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Nomor WhatsApp Penerima</label>
              <input
                type="tel"
                required
                value={newAddr.phone}
                onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
                className="w-full p-2.5 border rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Provinsi</label>
              <input
                type="text"
                required
                value={newAddr.province}
                onChange={(e) => setNewAddr({ ...newAddr, province: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Kota / Kabupaten</label>
              <input
                type="text"
                required
                value={newAddr.city}
                onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Kecamatan & Kode Pos</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Kecamatan"
                  value={newAddr.district}
                  onChange={(e) => setNewAddr({ ...newAddr, district: e.target.value })}
                  className="w-2/3 p-2.5 border rounded-lg bg-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Kode Pos"
                  value={newAddr.postalCode}
                  onChange={(e) => setNewAddr({ ...newAddr, postalCode: e.target.value })}
                  className="w-1/3 p-2.5 border rounded-lg bg-white"
                />
              </div>
            </div>
          </div>
          <div className="text-xs">
            <label className="block font-medium text-gray-700 mb-1">Alamat Lengkap</label>
            <textarea
              required
              rows={2}
              value={newAddr.addressLine}
              onChange={(e) => setNewAddr({ ...newAddr, addressLine: e.target.value })}
              placeholder="Nama jalan, nomor rumah/ruko, patokan..."
              className="w-full p-2.5 border rounded-lg bg-white"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              id="setDefault"
              checked={newAddr.isDefault}
              onChange={(e) => setNewAddr({ ...newAddr, isDefault: e.target.checked })}
              className="rounded text-indigo-600"
            />
            <label htmlFor="setDefault" className="text-gray-700">Jadikan alamat utama</label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-6 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
          >
            {loading ? "Menyimpan..." : "Simpan Alamat"}
          </button>
        </form>
      )}

      {addresses.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-xs">
          Belum ada alamat pengiriman yang tersimpan.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className="p-4 rounded-xl border border-gray-200 bg-white space-y-1 text-xs relative">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 text-sm">{a.label}</span>
                {a.isDefault && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                    Utama
                  </span>
                )}
              </div>
              <p className="font-semibold text-gray-800">{a.recipientName} ({a.phone})</p>
              <p className="text-gray-600 leading-relaxed">
                {a.addressLine}, {a.district}, {a.city}, {a.province} {a.postalCode}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
