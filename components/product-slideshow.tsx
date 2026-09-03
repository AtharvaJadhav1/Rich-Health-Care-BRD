"use client";

import { useEffect, useState } from "react";
import { SLIDES } from "@/lib/slides";
import { inr } from "@/lib/money";

export function ProductSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const slide = SLIDES[index];

  return (
    <div className="relative overflow-hidden rounded-xl border bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.src}
        alt={slide.name}
        className="mx-auto h-[280px] w-full object-contain sm:h-[380px] lg:h-[460px]"
      />
      <p className="border-t bg-background/95 px-4 py-3 text-center text-sm font-medium">
        {slide.name} · {inr(slide.mrp)} MRP
      </p>
      <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1.5 sm:bottom-16">
        {SLIDES.map((item, i) => (
          <button
            key={item.src}
            type="button"
            aria-label={`Show ${item.name}`}
            className={`h-1.5 rounded-full ${i === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40"}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
