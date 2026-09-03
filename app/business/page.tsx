import Link from "next/link";
import { businessModelRows, DEFAULT_PLAN } from "@/lib/business-model";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_ORIGIN = process.env.API_ORIGIN ?? `http://127.0.0.1:${process.env.API_PORT ?? "43124"}`;

async function loadPlan() {
  try {
    const res = await fetch(`${API_ORIGIN}/plan`, { cache: "no-store" });
    if (!res.ok) return DEFAULT_PLAN;
    return (await res.json()) as typeof DEFAULT_PLAN;
  } catch {
    return DEFAULT_PLAN;
  }
}

export default async function BusinessPage() {
  const plan = await loadPlan();
  const rows = businessModelRows(plan);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Business</p>
        <h1 className="font-heading mt-2 text-4xl font-semibold">Business model summary</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Direct-selling plan for Rich Health Care Ayurveda — joining fee, retail margin, binary matching income,
          and daily caps. Amounts reflect the live plan configuration.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%] px-4">Item</TableHead>
              <TableHead className="px-4">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.item}>
                <TableCell className="px-4 font-medium">{row.item}</TableCell>
                <TableCell className="px-4 whitespace-normal text-muted-foreground">{row.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
        Matching runs after admin approval of joining payments. Only active members count toward left/right
        totals. Unmatched volume carries forward; the daily cap is enforced in the matching job.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/register" className={buttonVariants()}>
          Register as distributor
        </Link>
        <Link href="/products" className={buttonVariants({ variant: "outline" })}>
          View products
        </Link>
      </div>
    </div>
  );
}
