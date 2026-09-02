import bcrypt from "bcrypt";
import { prisma } from "./db";
import { issuePassword } from "./auth";
import { isValidPan, normalizePan } from "./credentials";

const DEFAULT_PRODUCTS = [
  {
    name: "Daily Wellness Pack",
    description: "Daily nutrition pack at distributor price ₹999 (MRP ₹1,499).",
    dp: 999,
    mrp: 1499,
    stock: 0,
  },
  {
    name: "Immunity Drops 30ml",
    description: "Liquid immunity support. Retail margin ₹500 after approved orders.",
    dp: 999,
    mrp: 1499,
    stock: 0,
  },
  {
    name: "Joint Care Capsules",
    description: "Joint mobility capsules for the distributor catalog.",
    dp: 999,
    mrp: 1499,
    stock: 0,
  },
  {
    name: "Green Spirulina Tablets",
    description: "Spirulina tablets. Add a product photo from Admin → Products.",
    dp: 999,
    mrp: 1499,
    stock: 0,
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
    create: { id: "default", companyName: "Rich Health Care" },
  });
  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.product.createMany({
      data: DEFAULT_PRODUCTS.map((p) => ({ ...p, active: true })),
    });
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
