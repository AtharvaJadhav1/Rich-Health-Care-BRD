import { PRODUCT_CATALOG } from "@/lib/catalog";

export const SLIDES = PRODUCT_CATALOG.map((product) => ({
  src: product.imageUrl,
  name: product.name,
  mrp: product.mrp,
}));
