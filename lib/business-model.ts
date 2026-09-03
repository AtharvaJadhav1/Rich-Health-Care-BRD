import { inr } from "./money";

export type PlanSnapshot = {
  joiningAmount: number;
  pairValue: number;
  dailyPairCap: number;
  gstPercent: number;
  adminCutPercent: number;
  retailIncomePerUnit: number;
};

export type BusinessModelRow = {
  item: string;
  value: string;
};

/** Section 2 — Business Model Summary from the simplified BRD. */
export function businessModelRows(plan: PlanSnapshot): BusinessModelRow[] {
  const netPerPair = Math.round(
    plan.pairValue * (1 - plan.gstPercent / 100 - plan.adminCutPercent / 100),
  );
  const maxDailyNet = netPerPair * plan.dailyPairCap;

  return [
    { item: "Joining Amount", value: `${inr(plan.joiningAmount)} (paid manually)` },
    { item: "Distributor Price (DP)", value: inr(plan.joiningAmount) },
    { item: "MRP", value: inr(1499) },
    { item: "Retail Income", value: `Flat ${inr(plan.retailIncomePerUnit)} margin per unit sold` },
    {
      item: "Payment Method",
      value: "Manual — member submits reference, Admin approves/rejects",
    },
    {
      item: "Matching Income (gross)",
      value: `${inr(plan.pairValue)} per matched pair (1 Left + 1 Right)`,
    },
    { item: "GST Cut", value: `${plan.gstPercent}% of gross, per pair` },
    { item: "Admin Cut", value: `${plan.adminCutPercent}% of gross, per pair` },
    { item: "Matching Income (net)", value: `${inr(netPerPair)} per pair` },
    {
      item: "Daily Matching Cap",
      value: `${plan.dailyPairCap} pairs per member per day (${inr(maxDailyNet)} net max/day)`,
    },
    { item: "Unmatched pairs", value: "Carry forward to next day" },
    { item: "Plan Type", value: "Binary (1 Left leg, 1 Right leg per member)" },
  ];
}

export const DEFAULT_PLAN: PlanSnapshot = {
  joiningAmount: 999,
  pairValue: 250,
  dailyPairCap: 10,
  gstPercent: 5,
  adminCutPercent: 5,
  retailIncomePerUnit: 500,
};
