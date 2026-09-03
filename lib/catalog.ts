export type CatalogProduct = {
  sortOrder: number;
  name: string;
  description: string;
  dp: number;
  mrp: number;
  stock: number;
  imageUrl: string;
};

/** Live catalog — order and MRP from client handover. */
export const PRODUCT_CATALOG: CatalogProduct[] = [
  {
    sortOrder: 1,
    name: "Rich Health Amrit Juice Ai1",
    description: "500 ml herbal concentrate for daily immunity and wellness.",
    dp: 999,
    mrp: 1499,
    stock: 50,
    imageUrl: "/products/amrit-juice.jpg",
  },
  {
    sortOrder: 2,
    name: "Super Lady Care Juice",
    description: "500 ml Ayurvedic women's wellness juice.",
    dp: 1099,
    mrp: 1599,
    stock: 50,
    imageUrl: "/products/super-lady-care-juice.jpg",
  },
  {
    sortOrder: 3,
    name: "Diaba Nill Powder",
    description: "150 g Ayurvedic powder for daily sugar wellness support.",
    dp: 899,
    mrp: 1399,
    stock: 50,
    imageUrl: "/products/diaba-nill-powder.jpg",
  },
  {
    sortOrder: 4,
    name: "Orthonill Powder",
    description: "150 g Ayurvedic powder for joint comfort.",
    dp: 899,
    mrp: 1399,
    stock: 50,
    imageUrl: "/products/orthonill-powder.jpg",
  },
  {
    sortOrder: 5,
    name: "Orthonill Vati",
    description: "30 tablets for joint and muscle comfort.",
    dp: 1099,
    mrp: 1599,
    stock: 50,
    imageUrl: "/products/orthonill-vati.jpg",
  },
  {
    sortOrder: 6,
    name: "Petshudhhi Powder",
    description: "70 g digestive cleansing powder.",
    dp: 350,
    mrp: 500,
    stock: 50,
    imageUrl: "/products/petshudhhi-powder.jpg",
  },
  {
    sortOrder: 7,
    name: "Hair Growth Oil",
    description: "Ayurvedic hair oil with Amla and Bhringraj.",
    dp: 349,
    mrp: 499,
    stock: 50,
    imageUrl: "/products/hair-growth-oil.jpg",
  },
  {
    sortOrder: 8,
    name: "Anti Hair Fall Shampoo",
    description: "Ayurvedic shampoo to strengthen roots and reduce hair fall.",
    dp: 399,
    mrp: 599,
    stock: 50,
    imageUrl: "/products/anti-hair-fall-shampoo.jpg",
  },
  {
    sortOrder: 9,
    name: "Glow Herb Soap",
    description: "75 g herbal soap for a natural glow.",
    dp: 149,
    mrp: 199,
    stock: 50,
    imageUrl: "/products/glow-herb-soap.jpg",
  },
  {
    sortOrder: 10,
    name: "Skin Care Soap",
    description: "75 g neem and papaya soap for daily cleansing.",
    dp: 149,
    mrp: 199,
    stock: 50,
    imageUrl: "/products/skin-care-soap.jpg",
  },
  {
    sortOrder: 11,
    name: "Rich Fly Sanitary Pads",
    description: "11 pcs cotton pads with anion chip.",
    dp: 199,
    mrp: 299,
    stock: 50,
    imageUrl: "/products/rich-fly-pads.jpg",
  },
];

export const RETIRED_PRODUCT_NAMES = [
  "Daily Wellness Pack",
  "Immunity Drops 30ml",
  "Joint Care Capsules",
  "Green Spirulina Tablets",
  "Natural Herbs Hair Treatment Oil",
  "Ayurvedic Body Pain & Massage Oil",
];
