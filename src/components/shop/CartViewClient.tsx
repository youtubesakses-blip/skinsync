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

  const subtotal = cart.items.reduce((sum, item) => sum + item.variant.price * item.qty, 0);
  const totalQty = cart.items.reduce((s, i) => s + i.qty, 0);

  const handleUpdateQty = async (itemId: number, newQty: number) => {
    setLoadingId(itemId);
    try {
      if (newQty <= 0) {
        await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
        setCart((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== itemId) }));
      } else {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qty: newQty }),
        });
        if (res.ok) {
          setCart((prev) => ({
            ...prev,
            items: prev.items.map((item) => (item.id === itemId ? { ...item, qty: newQty } : item)),
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
      setCart((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== itemId) }));
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="py-20 text-center border-y border-[#070707]">
        <p className="furniture text-[#070707]/50 mb-4">Keranjang — kosong</p>
        <p className="italic text-xl text-[#070707]/70">Belum ada produk. Mulai dari yang paling laris.</p>
        <Link href="/products" className="inline-block mt-6 bg-[#EF6F79] text-white furniture px-8 py-4 hover:bg-[#070707] transition-colors">
          Lihat katalog
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-10 items-start">
      <div className="border-t border-[#070707]">
        {cart.items.map((item, i) => {
          const product = item.variant.product;
          const imageKey = product.images[0]?.key;
          const isItemLoading = loadingId === item.id;
          return (
            <div key={item.id} className={`grid grid-cols-[auto_1fr] sm:grid-cols-[auto_64px_1fr_auto] gap-4 items-center py-5 border-b border-[#070707]/25 ${isItemLoading ? "opacity-50 pointer-events-none" : ""}`}>
              <span className="furniture text-[#EF6F79]">0{i + 1}</span>
              <div className="relative w-16 h-16 bg-[#E4E5E0] border border-[#070707]/25 overflow-hidden hidden sm:block">
                {imageKey && <Image src={imageUrl(imageKey)} alt={product.name} fill className="object-cover" unoptimized />}
              </div>
              <div className="min-w-0">
                <Link href={`/products/${product.slug}`} className="text-lg font-medium hover:italic transition-all block truncate">
                  {product.name}
                </Link>
                <p className="italic text-xs text-[#070707]/55 mt-0.5">Varian — {item.variant.name}</p>
                <p className="font-semibold text-[#EF6F79] mt-1">{formatRupiah(item.variant.price)}</p>
              </div>
              <div className="flex items-center gap-4 col-span-2 sm:col-span-1 justify-end">
                <div className="inline-flex items-center border border-[#070707]">
                  <button type="button" onClick={() => handleUpdateQty(item.id, item.qty - 1)} className="w-8 h-8 grid place-items-center hover:bg-[#E4E5E0]">−</button>
                  <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                  <button type="button" onClick={() => handleUpdateQty(item.id, item.qty + 1)} disabled={item.qty >= item.variant.stock} className="w-8 h-8 grid place-items-center hover:bg-[#E4E5E0] disabled:opacity-30">+</button>
                </div>
                <button type="button" onClick={() => handleRemove(item.id)} className="furniture text-[#070707]/50 hover:text-[#EF6F79] underline underline-offset-4">
                  Hapus
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#070707] text-[#F7F7F4] p-6 lg:sticky lg:top-20">
        <p className="furniture text-[#F7F7F4]/50 mb-4">Ringkasan</p>
        <div className="flex justify-between text-[15px] py-2 border-b border-white/20">
          <span className="italic text-[#F7F7F4]/70">{totalQty} pcs</span>
          <span>{formatRupiah(subtotal)}</span>
        </div>
        <p className="italic text-xs text-[#F7F7F4]/55 mt-3">Ongkir dan voucher dihitung di checkout.</p>
        <div className="flex justify-between items-baseline mt-4">
          <span className="furniture">Subtotal</span>
          <span className="text-2xl font-semibold">{formatRupiah(subtotal)}</span>
        </div>
        <Link href="/checkout" className="block mt-5 bg-[#EF6F79] text-white furniture text-center px-6 py-4 hover:bg-[#F7F7F4] hover:text-[#070707] transition-colors">
          Lanjut ke checkout
        </Link>
      </div>
    </div>
  );
}
