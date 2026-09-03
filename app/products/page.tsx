import Link from "next/link";
import { inr } from "@/lib/money";
import { PageHero, PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Product = {
  id: string;
  name: string;
  description: string | null;
  dp: number;
  mrp: number;
  stock: number;
  imageUrl: string | null;
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
    <PageShell width="6xl">
      <PageHero
        eyebrow="Catalog"
        title="Ayurvedic range at distributor price"
        description="Photos and pack details from Rich Health Care Solution. Retail income is credited only after an admin approves the order payment."
      />
      {error ? <p className="text-destructive">{error}</p> : null}
      {products.length === 0 && !error ? (
        <p className="text-muted-foreground">No products are listed yet.</p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <Card key={product.id} className="transition-transform hover:-translate-y-0.5 hover:shadow-lg">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt=""
                className="h-52 w-full bg-gradient-to-b from-white to-muted/30 object-contain p-3"
              />
            ) : null}
            <CardHeader>
              <CardTitle className="text-base leading-snug">{product.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.description ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
              ) : null}
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-semibold text-primary">{inr(product.dp)}</p>
                <p className="text-sm text-muted-foreground line-through">{inr(product.mrp)} MRP</p>
              </div>
              <p className="text-xs text-muted-foreground">{product.stock} in stock</p>
              <Link href="/register" className={buttonVariants({ className: "w-full" })}>
                Join to order
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
