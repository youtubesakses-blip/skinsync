// src/components/shop/CartViewClient.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/money";
import { imageUrl } from "@/lib/image-url";

interface CartItem {
  id: number;
  qty: number;
  variant: {
    id: number;
    sku: string;
    name: string;
    price: number;
    comparePrice: number | null;
    stock: number;
    product: {
      id: number;
      name: string;
      slug: string;
      images: { key: string }[];
    };
  };
}

interface Cart {
  id: number;
  items: CartItem[];
}

export default function CartViewClient({ initialCart }: { initialCart: Cart }) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart>(initialCart);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.variant.price * item.qty,
    0
  );

  const handleUpdateQty = async (itemId: number, newQty: number) => {
    setLoadingId(itemId);
    try {
      if (newQty <= 0) {
        await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
        setCart((prev) => ({
          ...prev,
          items: prev.items.filter((item) => item.id !== itemId),
        }));
      } else {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qty: newQty }),
        });
        if (res.ok) {
          setCart((prev) => ({
            ...prev,
            items: prev.items.map((item) =>
              item.id === itemId ? { ...item, qty: newQty } : item
            ),
          }));
        }
      }
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = async (itemId: number) => {
    setLoadingId(itemId);
    try {
      await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
      setCart((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== itemId),
      }));
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm space-y-4">
        <div className="w-20 h-20 mx-auto bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800">Keranjang Belanja Anda Kosong</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Yuk temukan produk skincare yang cocok untuk merawat dan menutrisi kulit wajahmu!
        </p>
        <Link
          href="/products"
          className="inline-block py-3 px-8 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-sm"
        >
          Mulai Belanja Sekarang
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Item List */}
      <div className="lg:col-span-2 space-y-4">
        {cart.items.map((item) => {
          const product = item.variant.product;
          const imageKey = product.images[0]?.key;
          const isItemLoading = loadingId === item.id;

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex gap-4 sm:gap-6 items-center transition ${
                isItemLoading ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border">
                {imageKey ? (
                  <Image
                    src={imageUrl(imageKey)}
                    alt={product.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${product.slug}`}
                  className="text-sm sm:text-base font-bold text-gray-900 hover:text-indigo-600 transition truncate block"
                >
                  {product.name}
                </Link>
                <p className="text-xs text-gray-500 mt-0.5">
                  Varian: <span className="font-semibold text-gray-700">{item.variant.name}</span>
                </p>
                <div className="mt-2 text-sm sm:text-base font-extrabold text-indigo-600">
                  {formatRupiah(item.variant.price)}
                </div>
              </div>

              {/* Quantity controls & Remove */}
              <div className="flex flex-col items-end gap-3">
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="text-xs text-gray-400 hover:text-red-600 transition"
                  title="Hapus item"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white text-xs">
                  <button
                    type="button"
                    onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                    className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-gray-800">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                    disabled={item.qty >= item.variant.stock}
                    className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Box */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4 sticky top-24">
          <h2 className="text-base font-bold text-gray-900 border-b pb-3">Ringkasan Belanja</h2>

          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Total Item ({cart.items.reduce((s, i) => s + i.qty, 0)} pcs)</span>
            <span className="font-semibold text-gray-800">{formatRupiah(subtotal)}</span>
          </div>

          <p className="text-xs text-gray-400">
            *Ongkos kirim dan kupon diskon akan dihitung di halaman checkout selanjutnya.
          </p>

          <div className="border-t pt-4 flex justify-between items-baseline">
            <span className="text-sm font-bold text-gray-900">Subtotal</span>
            <span className="text-xl font-extrabold text-indigo-600">{formatRupiah(subtotal)}</span>
          </div>

          <Link
            href="/checkout"
            className="block w-full py-3.5 px-4 rounded-xl bg-indigo-600 text-white font-bold text-center text-sm hover:bg-indigo-700 transition shadow-md"
          >
            Lanjut ke Checkout →
          </Link>
        </div>
      </div>
    </div>
  );
}
