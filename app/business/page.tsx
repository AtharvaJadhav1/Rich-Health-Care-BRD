import Link from "next/link";
import { businessModelRows, DEFAULT_PLAN } from "@/lib/business-model";
import { PageHero, PageShell } from "@/components/page-shell";
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
    <PageShell width="4xl">
      <PageHero
        eyebrow="Business"
        title="Business model summary"
        description="Direct-selling plan for Rich Health Care Ayurveda — joining fee, retail margin, binary matching income, and daily caps. Amounts reflect the live plan configuration."
      />

      <div className="glass-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5 hover:bg-primary/5">
              <TableHead className="w-[40%] px-4 py-3">Item</TableHead>
              <TableHead className="px-4 py-3">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.item} className="hover:bg-muted/40">
                <TableCell className="px-4 font-medium">{row.item}</TableCell>
                <TableCell className="px-4 whitespace-normal text-muted-foreground">{row.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        Matching runs after admin approval of joining payments. Only active members count toward left/right
        totals. Unmatched volume carries forward; the daily cap is enforced in the matching job.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/register" className={buttonVariants({ size: "lg" })}>
          Register as distributor
        </Link>
        <Link href="/products" className={buttonVariants({ size: "lg", variant: "outline" })}>
          View products
        </Link>
      </div>
    </PageShell>
  );
}
