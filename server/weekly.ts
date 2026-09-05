import { prisma } from "./db";
import { creditWallet } from "./wallet";
import { isActiveMemberStatus } from "./member-status";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export type DownlineRow = {
  id: string;
  name: string;
  memberCode: string;
  phone: string;
  status: string;
  position: string | null;
  rank: string | null;
  joiningPaymentStatus: string | null;
  generatedAmount: number;
  walletBalance: number;
  activatedAt: string | null;
  createdAt: string;
};

function istDateKey(date = new Date()): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function parseUtcMidnight(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Monday–Sunday week in IST (India). */
export function weekBounds(date = new Date()) {
  const key = istDateKey(date);
  const dayUtc = parseUtcMidnight(key);
  const weekday = dayUtc.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const start = new Date(dayUtc);
  start.setUTCDate(dayUtc.getUTCDate() + mondayOffset);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return {
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: end.toISOString().slice(0, 10),
  };
}

export function weekRangeUtc(weekStart: string, weekEnd: string) {
  const from = new Date(`${weekStart}T00:00:00.000+05:30`);
  const to = new Date(`${weekEnd}T23:59:59.999+05:30`);
  return { from, to };
}

export async function collectDownline(rootId: string): Promise<DownlineRow[]> {
  const rows: DownlineRow[] = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const children = await prisma.member.findMany({
      where: { parentId },
      include: {
        wallet: { include: { ledger: true } },
        payments: { orderBy: { createdAt: "desc" } },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    for (const child of children) {
      queue.push(child.id);
      const generatedAmount = (child.wallet?.ledger ?? [])
        .filter((e) => e.type === "MATCHING_INCOME" || e.type === "RETAIL_INCOME")
        .reduce((sum, e) => sum + e.amount, 0);
      const joining = child.payments.find((p) => p.purpose === "JOINING");
      rows.push({
        id: child.id,
        name: child.name,
        memberCode: child.memberCode,
        phone: child.phone,
        status: child.status,
        position: child.position,
        rank: child.rank,
        joiningPaymentStatus: joining?.status ?? (isActiveMemberStatus(child.status) ? "APPROVED" : null),
        generatedAmount,
        walletBalance: child.wallet?.balance ?? 0,
        activatedAt: child.activatedAt?.toISOString() ?? null,
        createdAt: child.createdAt.toISOString(),
      });
    }
  }
  return rows;
}

export async function incomeInRange(memberId: string, from: Date, to: Date) {
  const wallet = await prisma.wallet.findUnique({ where: { memberId } });
  if (!wallet) {
    return { generatedAmount: 0, matchingAmount: 0, retailAmount: 0 };
  }
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      walletId: wallet.id,
      createdAt: { gte: from, lte: to },
      type: { in: ["MATCHING_INCOME", "RETAIL_INCOME"] },
    },
  });
  const matchingAmount = entries.filter((e) => e.type === "MATCHING_INCOME").reduce((s, e) => s + e.amount, 0);
  const retailAmount = entries.filter((e) => e.type === "RETAIL_INCOME").reduce((s, e) => s + e.amount, 0);
  return { generatedAmount: matchingAmount + retailAmount, matchingAmount, retailAmount };
}

export async function memberTeamSummary(memberId: string) {
  const downline = await collectDownline(memberId);
  const { weekStart, weekEnd } = weekBounds();
  const { from, to } = weekRangeUtc(weekStart, weekEnd);
  const income = await incomeInRange(memberId, from, to);
  const wallet = await prisma.wallet.findUnique({ where: { memberId } });
  const lifetime = wallet
    ? await prisma.ledgerEntry.aggregate({
        where: {
          walletId: wallet.id,
          type: { in: ["MATCHING_INCOME", "RETAIL_INCOME"] },
        },
        _sum: { amount: true },
      })
    : { _sum: { amount: 0 } };
  const weeklyPayouts = await prisma.weeklyPayout.findMany({
    where: { memberId },
    orderBy: { weekStart: "desc" },
    take: 12,
  });
  return {
    weekStart,
    weekEnd,
    downlineCount: downline.length,
    downlineActive: downline.filter((d) => isActiveMemberStatus(d.status)).length,
    downlinePending: downline.filter(
      (d) => d.status === "PENDING_PAYMENT" || d.status === "PENDING_PIN" || d.status === "PENDING_APPROVAL",
    ).length,
    downlineBlocked: downline.filter((d) => d.status === "BLOCKED").length,
    generatedThisWeek: income.generatedAmount,
    matchingThisWeek: income.matchingAmount,
    retailThisWeek: income.retailAmount,
    lifetimeGenerated: lifetime._sum.amount ?? 0,
    walletBalance: wallet?.balance ?? 0,
    downline,
    weeklyPayouts,
  };
}

export async function generateWeeklyReports(weekStart?: string) {
  const bounds = weekStart ? { weekStart, weekEnd: weekEndFromStart(weekStart) } : weekBounds();
  const { from, to } = weekRangeUtc(bounds.weekStart, bounds.weekEnd);
  const members = await prisma.member.findMany({
    where: { role: "MEMBER" },
  });
  let created = 0;
  let skipped = 0;
  const reports = [];
  for (const member of members) {
    const existing = await prisma.weeklyPayout.findUnique({
      where: { memberId_weekStart: { memberId: member.id, weekStart: bounds.weekStart } },
    });
    if (existing) {
      skipped += 1;
      reports.push(existing);
      continue;
    }
    const downline = await collectDownline(member.id);
    const income = await incomeInRange(member.id, from, to);
    const report = await prisma.weeklyPayout.create({
      data: {
        memberId: member.id,
        weekStart: bounds.weekStart,
        weekEnd: bounds.weekEnd,
        generatedAmount: income.generatedAmount,
        matchingAmount: income.matchingAmount,
        retailAmount: income.retailAmount,
        downlineTotal: downline.length,
        downlineActive: downline.filter((d) => isActiveMemberStatus(d.status)).length,
        downlinePending: downline.filter(
      (d) => d.status === "PENDING_PAYMENT" || d.status === "PENDING_PIN" || d.status === "PENDING_APPROVAL",
    ).length,
        teamReport: JSON.stringify(downline),
        status: "PENDING",
      },
    });
    created += 1;
    reports.push(report);
  }
  return { ...bounds, created, skipped, count: reports.length };
}

function weekEndFromStart(weekStart: string) {
  const start = parseUtcMidnight(weekStart);
  start.setUTCDate(start.getUTCDate() + 6);
  return start.toISOString().slice(0, 10);
}

export async function approveWeeklyPayout(payoutId: string, adminId: string) {
  const payout = await prisma.weeklyPayout.findUnique({ where: { id: payoutId } });
  if (!payout) throw Object.assign(new Error("Weekly report not found."), { statusCode: 404 });
  if (payout.status === "APPROVED") {
    throw Object.assign(new Error("This weekly payout is already approved."), { statusCode: 400 });
  }
  if (payout.generatedAmount > 0) {
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { memberId: payout.memberId } });
    if (wallet.balance < payout.generatedAmount) {
      throw Object.assign(
        new Error(
          `Wallet balance ₹${wallet.balance} is less than this week's generated ₹${payout.generatedAmount}.`,
        ),
        { statusCode: 400 },
      );
    }
    await creditWallet({
      memberId: payout.memberId,
      type: "WEEKLY_PAYOUT",
      amount: -payout.generatedAmount,
      note: `Weekly payout ${payout.weekStart} to ${payout.weekEnd} approved.`,
    });
  }
  return prisma.weeklyPayout.update({
    where: { id: payoutId },
    data: {
      status: "APPROVED",
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  });
}
