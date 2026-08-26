import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { utcDateKey } from "../server/dates";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Member@123", 10);
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const today = utcDateKey();

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

  await prisma.ledgerEntry.deleteMany();
  await prisma.binaryVolume.deleteMany();
  await prisma.paymentSubmission.deleteMany();
  await prisma.order.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.matchingRun.deleteMany();
  await prisma.member.deleteMany();
  await prisma.product.deleteMany();

  const admin = await prisma.member.create({
    data: {
      name: "Platform Admin",
      phone: "9999999999",
      password: adminPassword,
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
      name: "Priya Sharma",
      phone: "9000000001",
      password,
      memberCode: "RHC0001",
      role: "MEMBER",
      status: "ACTIVE",
      rank: "Silver",
      activatedAt: new Date("2026-01-15"),
      wallet: { create: { balance: 0 } },
    },
  });

  const amit = await prisma.member.create({
    data: {
      name: "Amit Verma",
      phone: "9000000002",
      password,
      memberCode: "RHC0002",
      role: "MEMBER",
      status: "ACTIVE",
      rank: "Distributor",
      sponsorId: root.id,
      parentId: root.id,
      position: "LEFT",
      activatedAt: new Date(),
      wallet: { create: { balance: 0 } },
    },
  });

  const kavita = await prisma.member.create({
    data: {
      name: "Kavita Nair",
      phone: "9000000003",
      password,
      memberCode: "RHC0003",
      role: "MEMBER",
      status: "ACTIVE",
      rank: "Distributor",
      sponsorId: root.id,
      parentId: root.id,
      position: "RIGHT",
      activatedAt: new Date(),
      wallet: { create: { balance: 0 } },
    },
  });

  const neha = await prisma.member.create({
    data: {
      name: "Neha Joshi",
      phone: "9000000004",
      password,
      memberCode: "RHC0004",
      role: "MEMBER",
      status: "ACTIVE",
      rank: "Distributor",
      sponsorId: amit.id,
      parentId: amit.id,
      position: "LEFT",
      activatedAt: new Date(),
      wallet: { create: { balance: 0 } },
    },
  });

  const rohan = await prisma.member.create({
    data: {
      name: "Rohan Desai",
      phone: "9000000005",
      password,
      memberCode: "RHC0005",
      role: "MEMBER",
      status: "ACTIVE",
      rank: "Distributor",
      sponsorId: amit.id,
      parentId: amit.id,
      position: "RIGHT",
      activatedAt: new Date(),
      wallet: { create: { balance: 0 } },
    },
  });

  await prisma.binaryVolume.createMany({
    data: [
      {
        memberId: root.id,
        date: today,
        leftCount: 3,
        rightCount: 1,
        carryLeft: 0,
        carryRight: 0,
      },
      {
        memberId: amit.id,
        date: today,
        leftCount: 1,
        rightCount: 1,
        carryLeft: 0,
        carryRight: 0,
      },
      {
        memberId: kavita.id,
        date: today,
        leftCount: 0,
        rightCount: 0,
      },
      {
        memberId: neha.id,
        date: today,
        leftCount: 0,
        rightCount: 0,
      },
      {
        memberId: rohan.id,
        date: today,
        leftCount: 0,
        rightCount: 0,
      },
    ],
  });

  await prisma.product.createMany({
    data: [
      {
        name: "Daily Wellness Pack",
        dp: 999,
        mrp: 1499,
        stock: 120,
        active: true,
      },
      {
        name: "Immunity Drops 30ml",
        dp: 999,
        mrp: 1499,
        stock: 80,
        active: true,
      },
      {
        name: "Joint Care Capsules",
        dp: 999,
        mrp: 1499,
        stock: 60,
        active: true,
      },
      {
        name: "Green Spirulina Tablets",
        dp: 999,
        mrp: 1499,
        stock: 90,
        active: true,
      },
    ],
  });

  console.log("Seeded Rich Health Care demo data.");
  console.log("Admin:", admin.phone, "/ Admin@123");
  console.log("Root distributor:", root.phone, "/ Member@123 / code", root.memberCode);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
