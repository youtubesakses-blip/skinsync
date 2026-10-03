// Choreography: one rAF scroll handler writing --p per .stage,
// one IntersectionObserver adding .in, ritual rows lit cumulatively.
"use client";

import { useEffect } from "react";

export default function AurelleChoreo({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let raf = 0;
    let lastRitual = -1;
    const stages = Array.from(document.querySelectorAll<HTMLElement>(".stage"));

    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const stage of stages) {
        const rect = stage.getBoundingClientRect();
        const total = Math.max(1, rect.height - vh);
        const p = Math.min(1, Math.max(0, -rect.top / total));
        stage.style.setProperty("--p", p.toFixed(4));

        if (stage.dataset.ritual !== undefined) {
          const i = Math.min(3, Math.floor(p * 4));
          if (i !== lastRitual) {
            lastRitual = i;
            stage.querySelectorAll(".ritual-row").forEach((row, idx) => {
              row.classList.toggle("lit", idx <= i);
            });
          }
        }
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll("[data-rev], .rev-words").forEach((el) => io.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return <>{children}</>;
}

/** Split text into per-word spans for staggered rise. */
export function words(text: string) {
  return text.split(" ").map((w, i) => (
    <span key={i} className="w" style={{ ["--i" as string]: i }}>
      {w}
      {i < text.split(" ").length - 1 ? " " : ""}
    </span>
  ));
}
