import { prisma } from "./db";

export async function creditWallet(params: {
  memberId: string;
  type: "RETAIL_INCOME" | "MATCHING_INCOME" | "JOINING_CREDIT" | "WEEKLY_PAYOUT";
  amount: number;
  note?: string;
  grossAmount?: number;
  gstCut?: number;
  adminCut?: number;
}) {
  if (params.amount === 0 && !params.grossAmount) return null;
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUniqueOrThrow({
      where: { memberId: params.memberId },
    });
    const entry = await tx.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type: params.type,
        amount: params.amount,
        note: params.note,
        grossAmount: params.grossAmount ?? null,
        gstCut: params.gstCut ?? null,
        adminCut: params.adminCut ?? null,
      },
    });
    const sum = await tx.ledgerEntry.aggregate({
      where: { walletId: wallet.id },
      _sum: { amount: true },
    });
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: sum._sum.amount ?? 0 },
    });
    return entry;
  });
}
