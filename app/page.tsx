import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inr } from "@/lib/money";

const steps = [
  { title: "Join with PAN", body: "Register with your name, phone, and PAN. We issue your Member ID and password." },
  { title: "Pay ₹999 or use a PIN", body: "Submit a UTR, or consume a PIN. Nothing counts until that step completes." },
  { title: "Build both legs", body: "New active members spill over left-first. Matching pairs at ₹225 net, 10 pairs a day." },
];

type Product = {
  id: string;
  name: string;
  description: string | null;
  dp: number;
  mrp: number;
  imageUrl: string | null;
};

const API_ORIGIN = process.env.API_ORIGIN ?? `http://127.0.0.1:${process.env.API_PORT ?? "43124"}`;

async function loadProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_ORIGIN}/products`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as Product[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const products = await loadProducts();

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
              <Row k="Joining amount" v="₹999 (UTR or PIN)" />
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
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Products</p>
          <h2 className="font-heading mt-2 text-3xl font-semibold">Catalog at distributor price</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Names, details, DP and MRP come from the live catalog. Add product photos in Admin when the
            client supplies assets.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <Card key={product.id}>
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt="" className="h-40 w-full rounded-t-xl object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-t-xl bg-muted text-sm text-muted-foreground">
                  Photo pending
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{product.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{product.description}</p>
                <p className="text-sm text-muted-foreground line-through">{inr(product.mrp)} MRP</p>
                <p className="text-xl font-semibold">{inr(product.dp)} DP</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 md:grid-cols-3">
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
