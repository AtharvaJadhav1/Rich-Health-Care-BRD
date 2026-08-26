import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  { title: "Join with a sponsor", body: "Register with an active distributor code. Your binary slot is reserved immediately." },
  { title: "Pay ₹999 manually", body: "Transfer the joining amount and submit your UTR. Nothing counts until admin approval." },
  { title: "Build both legs", body: "New active members spill over left-first. Matching pairs at ₹225 net, 10 pairs a day." },
];

export default function HomePage() {
  return (
    <div>
      <section className="border-b bg-[radial-gradient(circle_at_top,_oklch(0.93_0.05_145),_transparent_55%)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
              Direct selling · Binary plan
            </p>
            <h1 className="font-heading text-4xl leading-tight font-semibold md:text-5xl">
              Wellness products. A fair pairing plan. Wallet credits you can audit.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Rich Health Care distributors join at ₹999, sell at a ₹500 retail margin, and earn matching
              income only after payments are approved. Carry-forward is automatic. The 10-pair daily cap is
              enforced in the engine, not on a slide.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>
                Become a distributor
              </Link>
              <Link href="/products" className={buttonVariants({ size: "lg", variant: "outline" })}>
                View products
              </Link>
            </div>
          </div>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Plan snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Row k="Joining amount" v="₹999 (manual UTR)" />
              <Row k="Distributor price" v="₹999" />
              <Row k="MRP" v="₹1,499" />
              <Row k="Retail income" v="₹500 per unit, after approval" />
              <Row k="Matching (gross)" v="₹250 per pair" />
              <Row k="GST + admin cut" v="5% + 5%" />
              <Row k="Matching (net)" v="₹225 per pair" />
              <Row k="Daily cap" v="10 pairs · ₹2,250 net" />
            </CardContent>
          </Card>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-3">
        {steps.map((step, i) => (
          <Card key={step.title}>
            <CardHeader>
              <p className="text-xs font-medium text-primary">0{i + 1}</p>
              <CardTitle>{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">{step.body}</CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}
