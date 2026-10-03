// src/components/shop/ProductIndexList.tsx
// Pattern C: ruled index list — tanpa floating preview.

"use client";

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
  return (
    <div className="plist">
      {items.map((it) => (
        <Link key={it.slug} href={`/products/${it.slug}`} className="prow">
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
