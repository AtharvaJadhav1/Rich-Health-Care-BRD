import bcrypt from "bcrypt";
import { prisma } from "./db";
import { issuePassword } from "./auth";
import { isValidPan, normalizePan } from "./credentials";

const DEMO_PRODUCT_NAMES = [
  "Daily Wellness Pack",
  "Immunity Drops 30ml",
  "Joint Care Capsules",
  "Green Spirulina Tablets",
];

const DEFAULT_PRODUCTS = [
  {
    name: "Super Lady Care Juice",
    description: "500 ml Ayurvedic women's wellness juice for daily vitality and hormonal support.",
    dp: 999,
    mrp: 1499,
    stock: 50,
    imageUrl: "/products/super-lady-care-juice.jpg",
  },
  {
    name: "Rich Health Amrit Juice Ai1",
    description: "500 ml herbal concentrate blended as a daily immunity and wellness tonic.",
    dp: 999,
    mrp: 1499,
    stock: 50,
    imageUrl: "/products/amrit-juice.jpg",
  },
  {
    name: "Orthonill Powder",
    description: "150 g Ayurvedic powder for joint comfort. Take as directed on the pack.",
    dp: 999,
    mrp: 1499,
    stock: 50,
    imageUrl: "/products/orthonill-powder.jpg",
  },
  {
    name: "Orthonill Vati",
    description: "30 tablets for joint and muscle comfort. One tablet morning and evening with lukewarm water.",
    dp: 999,
    mrp: 1499,
    stock: 50,
    imageUrl: "/products/orthonill-vati.jpg",
  },
  {
    name: "Diaba Nill Powder",
    description: "150 g Ayurvedic powder formulated as a daily wellness support for sugar management.",
    dp: 999,
    mrp: 1499,
    stock: 50,
    imageUrl: "/products/diaba-nill-powder.jpg",
  },
  {
    name: "Petshudhhi Powder",
    description: "70 g digestive cleansing powder. Take with lukewarm water as directed.",
    dp: 999,
    mrp: 1499,
    stock: 50,
    imageUrl: "/products/petshudhhi-powder.jpg",
  },
  {
    name: "Hair Growth Oil",
    description: "Ayurvedic hair oil with Amla and Bhringraj to nourish the scalp and reduce hair fall.",
    dp: 999,
    mrp: 1499,
    stock: 50,
    imageUrl: "/products/hair-growth-oil.jpg",
  },
  {
    name: "Natural Herbs Hair Treatment Oil",
    description: "Herbal hair treatment oil to strengthen roots and nourish the scalp.",
    dp: 999,
    mrp: 1499,
    stock: 50,
    imageUrl: "/products/hair-and-body-oils.jpg",
  },
  {
    name: "Ayurvedic Body Pain & Massage Oil",
    description: "Massage oil for joint and muscle comfort and daily relaxation.",
    dp: 999,
    mrp: 1499,
    stock: 50,
    imageUrl: "/products/hair-and-body-oils.jpg",
  },
  {
    name: "Anti Hair Fall Shampoo",
    description: "Ayurvedic shampoo to strengthen roots, reduce hair fall, and keep the scalp clean.",
    dp: 999,
    mrp: 1499,
    stock: 50,
    imageUrl: "/products/anti-hair-fall-shampoo.jpg",
  },
  {
    name: "Skin Care Soap",
    description: "75 g neem and papaya soap for daily cleansing. MRP ₹175.",
    dp: 125,
    mrp: 175,
    stock: 50,
    imageUrl: "/products/skin-care-soap.jpg",
  },
  {
    name: "Glow Herb Soap",
    description: "75 g herbal soap for a natural glow. MRP ₹199.",
    dp: 140,
    mrp: 199,
    stock: 50,
    imageUrl: "/products/glow-herb-soap.jpg",
  },
  {
    name: "Rich Fly Sanitary Pads",
    description: "11 pcs, 290 mm cotton pads with anion chip. Chemical-free personal care.",
    dp: 999,
    mrp: 1499,
    stock: 50,
    imageUrl: "/products/rich-fly-pads.jpg",
  },
];

export async function ensurePlanAndCatalog() {
  await prisma.planConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      joiningAmount: 999,
      pairValue: 250,
      dailyPairCap: 10,
      gstPercent: 5,
      adminCutPercent: 5,
      retailIncomePerUnit: 500,
    },
  });
  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "Rich Health Care Solution",
      contactPhone: "9307116704",
    },
  });
  const settings = await prisma.companySettings.findUniqueOrThrow({ where: { id: "default" } });
  if (!settings.contactPhone) {
    await prisma.companySettings.update({
      where: { id: "default" },
      data: { contactPhone: "9307116704" },
    });
  }
  await prisma.product.updateMany({
    where: { name: { in: DEMO_PRODUCT_NAMES } },
    data: { active: false },
  });
  for (const product of DEFAULT_PRODUCTS) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: { ...product, active: true },
      });
    } else {
      await prisma.product.create({ data: { ...product, active: true } });
    }
  }
}

export async function publicStatus() {
  await ensurePlanAndCatalog();
  const members = await prisma.member.count();
  const company = await prisma.companySettings.findUniqueOrThrow({ where: { id: "default" } });
  const plan = await prisma.planConfig.findUniqueOrThrow({ where: { id: "default" } });
  const root = await prisma.member.findFirst({
    where: { role: "MEMBER", status: "ACTIVE", sponsorId: null },
    orderBy: { createdAt: "asc" },
  });
  return {
    needsSetup: members === 0,
    companyName: company.companyName,
    rootSponsorCode: root?.memberCode ?? company.rootMemberCode ?? "",
    joiningAmount: plan.joiningAmount,
    collectionBank: {
      accountName: company.accountName,
      bankName: company.bankName,
      accountNumber: company.accountNumber,
      ifsc: company.ifsc,
      upiId: company.upiId,
    },
    contactEmail: company.contactEmail,
    contactPhone: company.contactPhone,
  };
}

export async function bootstrapCompany(input: {
  companyName: string;
  adminName: string;
  adminPhone: string;
  adminPassword: string;
  adminPan: string;
  rootName: string;
  rootPhone: string;
  rootPan: string;
  accountName?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  contactEmail?: string;
  contactPhone?: string;
}) {
  const existing = await prisma.member.count();
  if (existing > 0) {
    throw Object.assign(new Error("This platform is already set up."), { statusCode: 409 });
  }
  const adminPan = normalizePan(input.adminPan);
  const rootPan = normalizePan(input.rootPan);
  if (!isValidPan(adminPan) || !isValidPan(rootPan)) {
    throw Object.assign(new Error("Enter valid PAN numbers (e.g. ABCDE1234F)."), { statusCode: 400 });
  }
  if (adminPan === rootPan) {
    throw Object.assign(new Error("Admin and first distributor need different PAN numbers."), { statusCode: 400 });
  }
  await ensurePlanAndCatalog();
  const rootPassword = issuePassword();
  const admin = await prisma.member.create({
    data: {
      name: input.adminName.trim(),
      phone: input.adminPhone,
      panNumber: adminPan,
      kycStatus: "VERIFIED",
      password: await bcrypt.hash(input.adminPassword, 12),
      memberCode: "ADMIN",
      role: "ADMIN",
      status: "ACTIVE",
      rank: "Admin",
      activatedAt: new Date(),
      wallet: { create: { balance: 0 } },
    },
  });
  const root = await prisma.member.create({
    data: {
      name: input.rootName.trim(),
      phone: input.rootPhone,
      panNumber: rootPan,
      kycStatus: "VERIFIED",
      password: await bcrypt.hash(rootPassword, 12),
      issuedPassword: rootPassword,
      memberCode: "RHC0001",
      role: "MEMBER",
      status: "ACTIVE",
      rank: "Distributor",
      activatedAt: new Date(),
      accountName: input.accountName?.trim() || null,
      bankName: input.bankName?.trim() || null,
      accountNumber: input.accountNumber?.trim() || null,
      ifsc: input.ifsc?.trim().toUpperCase() || null,
      upiId: input.upiId?.trim() || null,
      wallet: { create: { balance: 0 } },
    },
  });
  await prisma.companySettings.update({
    where: { id: "default" },
    data: {
      companyName: input.companyName.trim(),
      accountName: input.accountName?.trim() ?? "",
      bankName: input.bankName?.trim() ?? "",
      accountNumber: input.accountNumber?.trim() ?? "",
      ifsc: input.ifsc?.trim().toUpperCase() ?? "",
      upiId: input.upiId?.trim() ?? "",
      rootMemberCode: root.memberCode,
      contactEmail: input.contactEmail?.trim() ?? "",
      contactPhone: input.contactPhone?.trim() ?? "",
    },
  });
  return {
    admin: { phone: admin.phone, memberCode: admin.memberCode },
    root: {
      name: root.name,
      phone: root.phone,
      memberCode: root.memberCode,
      password: rootPassword,
    },
  };
}
