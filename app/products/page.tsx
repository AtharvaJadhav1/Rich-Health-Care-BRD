import Link from "next/link";
import { inr } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Product = {
  id: string;
  name: string;
  dp: number;
  mrp: number;
  stock: number;
};

const API_ORIGIN = process.env.API_ORIGIN ?? `http://127.0.0.1:${process.env.API_PORT ?? "43124"}`;

async function loadProducts(): Promise<{ products: Product[]; error: string | null }> {
  try {
    const res = await fetch(`${API_ORIGIN}/products`, { cache: "no-store" });
    if (!res.ok) {
      return { products: [], error: "Could not load the product catalog." };
    }
    return { products: (await res.json()) as Product[], error: null };
  } catch {
    return { products: [], error: "Could not reach the catalog API." };
  }
}

export default async function ProductsPage() {
  const { products, error } = await loadProducts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Catalog</p>
        <h1 className="font-heading mt-2 text-4xl font-semibold">Wellness range at distributor price</h1>
        <p className="mt-3 text-muted-foreground">
          Every pack has a ₹999 DP and ₹1,499 MRP. The ₹500 retail margin is credited only after an admin
          approves the order payment.
        </p>
      </div>
      {error ? <p className="text-destructive">{error}</p> : null}
      {products.length === 0 && !error ? (
        <p className="text-muted-foreground">No products are listed yet.</p>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle className="text-lg">{product.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-through">{inr(product.mrp)} MRP</p>
              <p className="text-2xl font-semibold">{inr(product.dp)} DP</p>
              <p className="text-sm text-muted-foreground">{product.stock} in stock</p>
              <Link href="/register" className={buttonVariants({ className: "w-full" })}>
                Join to order
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
