"use client";

import { useEffect, useState } from "react";
import { SLIDES } from "@/lib/slides";
import { inr } from "@/lib/money";
import { cn } from "@/lib/utils";

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
    <div className="glass-panel relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-amber-400" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.src}
        alt={slide.name}
        className="mx-auto h-[280px] w-full bg-white/50 object-contain p-4 sm:h-[380px] lg:h-[440px]"
      />
      <div className="flex items-center justify-between gap-4 border-t border-white/60 bg-card/80 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
        <p className="text-sm font-medium sm:text-base">
          {slide.name} · <span className="text-primary">{inr(slide.mrp)}</span> MRP
        </p>
        <div className="flex items-center gap-1.5">
          {SLIDES.map((item, i) => (
            <button
              key={item.src}
              type="button"
              aria-label={`Show ${item.name}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-7 bg-primary" : "w-1.5 bg-muted-foreground/35 hover:bg-muted-foreground/60",
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
