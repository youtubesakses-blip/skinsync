// src/components/shop/ProductIndexList.tsx
// Pattern C: ruled index list dengan floating multiplied preview.
// Preview mengikuti kursor (rAF-throttled); di sentuh, thumbnail inline per baris.

"use client";

import { useRef, useState } from "react";
import Link from "next/link";

export interface IndexItem {
  slug: string;
  index: string;
  name: string;
  note: string;
  price: string;
  img: string | null;
}

export default function ProductIndexList({ items }: { items: IndexItem[] }) {
  const [active, setActive] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const onMove = (e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      previewRef.current?.style.setProperty("transform", `translate3d(${x + 24}px, ${y - 170}px, 0)`);
    });
  };

  return (
    <div className="plist" onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
      <div ref={previewRef} className={`ppreview${active ? " on" : ""}`} aria-hidden="true">
        {active ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active} alt="" />
        ) : null}
      </div>

      {items.map((it) => (
        <Link
          key={it.slug}
          href={`/products/${it.slug}`}
          className="prow"
          onMouseEnter={() => it.img && setActive(it.img)}
          onFocus={() => it.img && setActive(it.img)}
        >
          <span className="pthumb">
            {it.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.img} alt="" loading="lazy" />
            ) : null}
          </span>
          <i>{it.index}</i>
          <span className="pmain">
            <b>{it.name}</b>
            <em className="italic">{it.note}</em>
          </span>
          <s>{it.price}</s>
        </Link>
      ))}
    </div>
  );
}
