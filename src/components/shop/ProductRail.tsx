// src/components/shop/ProductRail.tsx
// Pattern A: pinned horizontal product rail — vertical scroll scrubs products sideways.
// Satu rAF scroll handler menulis --p/--max; CSS mengerjakan sisanya.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface RailProduct {
  id: number;
  slug: string;
  index: string;
  name: string;
  note: string;
  tag: string;
  price: string;
  img: string | null;
  variantId: number | null;
  inStock: boolean;
}

function AddButton({ p, isLoggedIn }: { p: RailProduct; isLoggedIn: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  if (!p.inStock || p.variantId == null) {
    return (
      <span className="add" aria-disabled="true">
        Stok habis
      </span>
    );
  }

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      router.push("/login?next=" + encodeURIComponent("/"));
      return;
    }
    if (state !== "idle") return;
    setState("busy");
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: p.variantId, qty: 1 }),
      });
      if (res.ok) {
        setState("done");
        router.refresh();
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  };

  return (
    <button type="button" className="add" onClick={onClick} disabled={state === "busy"}>
      {state === "busy" ? "Menambahkan…" : state === "done" ? "Masuk keranjang" : isLoggedIn ? "Tambah ke keranjang" : "Masuk untuk membeli"}
    </button>
  );
}

export default function ProductRail({
  products,
  isLoggedIn,
}: {
  products: RailProduct[];
  isLoggedIn: boolean;
}) {
  const stageRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  // Kartu terakhir adalah CTA "lihat katalog", jadi total = produk + 1
  const cardCount = products.length + 1;
  const total = String(products.length).padStart(2, "0");

  useEffect(() => {
    const stage = stageRef.current;
    const track = trackRef.current;
    const counter = counterRef.current;
    if (!stage || !track || !counter) return;

    let last = -1;
    let tick = false;

    const measure = () => {
      // Jarak horizontal = lebar track dikurangi 1 viewport.
      // Track memakai width:max-content + aspect-ratio tetap sehingga stabil.
      const max = Math.max(0, track.scrollWidth - window.innerWidth);
      stage.style.setProperty("--max", String(max));
      stage.style.setProperty("--h", max + window.innerHeight * 1.2 + "px");
    };

    const update = () => {
      tick = false;
      const cards = Array.from(track.children) as HTMLElement[];
      if (cards.length === 0) return;
      const r = stage.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / span));
      stage.style.setProperty("--p", p.toFixed(4));
      const i = Math.min(cards.length - 1, Math.round(p * (cards.length - 1)));
      if (i !== last) {
        last = i;
        cards.forEach((c, k) => c.classList.toggle("on", k === i));
        // Counter: produk 01..05, kartu terakhir tampil sebagai "→"
        if (i < products.length) {
          counter.textContent = String(i + 1).padStart(2, "0") + " / " + total;
        } else {
          counter.textContent = "→ / " + total;
        }
      }
    };

    const onScroll = () => {
      if (!tick) {
        tick = true;
        requestAnimationFrame(update);
      }
    };
    const onResize = () => {
      measure();
      update();
    };

    measure();
    update();
    // Ukur ulang setelah gambar dimuat (scrollWidth berubah saat img muncul)
    const imgs = Array.from(track.querySelectorAll("img"));
    const onImg = () => {
      measure();
      update();
    };
    imgs.forEach((img) => {
      if (img.complete) return;
      img.addEventListener("load", onImg);
    });
    const ro = new ResizeObserver(onImg);
    ro.observe(track);
    const t = window.setTimeout(() => {
      measure();
      update();
    }, 800);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
    // Font Bodoni memengaruhi lebar track — ukur ulang saat fonts siap
    if (typeof document !== "undefined" && "fonts" in document) {
      (document as Document).fonts?.ready.then(() => {
        measure();
        update();
      }).catch(() => {});
    }
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
      imgs.forEach((img) => img.removeEventListener("load", onImg));
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onResize);
    };
  }, [total, products.length]);

  return (
    <section className="rail-stage" id="produk" aria-label="Koleksi harian">
      <div className="rail-pin">
        <header className="rail-head">
          <h2 className="display-tight text-4xl sm:text-6xl font-medium">
            Koleksi <em className="italic font-normal">harian</em>
          </h2>
          <span className="flex items-center gap-6">
            <span ref={counterRef} id="counter" className="furniture text-[#070707]/60">
              01 / {total}
            </span>
            <Link href="/products" className="furniture underline underline-offset-4 hidden sm:inline">
              Semua produk
            </Link>
          </span>
        </header>

        <div className="track" id="track" ref={trackRef}>
          {products.map((p, k) => (
            <article
              key={p.id}
              className="card"
              data-i={k}
              style={{ ["--cp" as string]: cardCount > 1 ? k / (cardCount - 1) : 0 }}
            >
              <Link href={`/products/${p.slug}`} aria-label={p.name} className="block">
                <div className="shot">
                  {p.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.img} alt={p.name} loading={k === 0 ? "eager" : "lazy"} />
                  ) : null}
                </div>
              </Link>
              <div className="meta">
                <i>{p.index}</i>
                <b>
                  <Link href={`/products/${p.slug}`}>{p.name}</Link>
                </b>
                <s>{p.price}</s>
                <em className="italic text-[15px] text-[#070707]/65">{p.note}</em>
                <span className="fur-tag furniture text-[#070707]/50">{p.tag}</span>
                <AddButton p={p} isLoggedIn={isLoggedIn} />
              </div>
            </article>
          ))}

          {/* Kartu penutup setelah produk ke-5: panah ke katalog */}
          <Link
            href="/products"
            className="card end-card"
            data-i={products.length}
            style={{ ["--cp" as string]: 1 }}
            aria-label="Lihat semua produk di katalog"
          >
            <span className="end-arrow" aria-hidden="true">→</span>
            <span className="end-title display-tight">
              Lihat <em className="italic font-normal">semua produk</em>
            </span>
            <span className="furniture end-sub">Buka katalog — {total} pilihan terkurasi</span>
            <span className="furniture end-cta">Katalog ↗</span>
          </Link>
        </div>

        <div className="bar" aria-hidden="true">
          <i />
        </div>
      </div>
    </section>
  );
}
