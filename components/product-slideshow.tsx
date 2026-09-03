"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/products/super-lady-care-juice.jpg", name: "Super Lady Care Juice" },
  { src: "/products/amrit-juice.jpg", name: "Amrit Juice Ai1" },
  { src: "/products/orthonill-powder.jpg", name: "Orthonill Powder" },
  { src: "/products/orthonill-vati.jpg", name: "Orthonill Vati" },
  { src: "/products/diaba-nill-powder.jpg", name: "Diaba Nill Powder" },
  { src: "/products/petshudhhi-powder.jpg", name: "Petshudhhi Powder" },
  { src: "/products/hair-growth-oil.jpg", name: "Hair Growth Oil" },
  { src: "/products/hair-and-body-oils.jpg", name: "Hair and body oils" },
  { src: "/products/anti-hair-fall-shampoo.jpg", name: "Anti Hair Fall Shampoo" },
  { src: "/products/skin-care-soap.jpg", name: "Skin Care Soap" },
  { src: "/products/glow-herb-soap.jpg", name: "Glow Herb Soap" },
  { src: "/products/rich-fly-pads.jpg", name: "Rich Fly Sanitary Pads" },
];

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
      <p className="border-t bg-background/95 px-4 py-3 text-center text-sm font-medium">{slide.name}</p>
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
