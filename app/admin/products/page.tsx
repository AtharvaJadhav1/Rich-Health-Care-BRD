"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AdminNav } from "@/components/admin-nav";
import { api } from "@/lib/api";
import { inr } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Product = {
  id: string;
  name: string;
  dp: number;
  mrp: number;
  stock: number;
  active: boolean;
};

export default function AdminProductsPage() {
  return (
    <RequireAuth role="ADMIN">
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const empty = { name: "", dp: 999, mrp: 1499, stock: 0 };
  const [form, setForm] = useState(empty);
  const [rows, setRows] = useState<Product[] | null>(null);

  async function load() {
    setRows(await api<Product[]>("/admin/products"));
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/admin/products", {
        method: "POST",
        body: { ...form, dp: Number(form.dp), mrp: Number(form.mrp), stock: Number(form.stock) },
      });
      toast.success("Product added");
      setForm(empty);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add product");
    }
  }

  async function toggle(product: Product) {
    await api(`/admin/products/${product.id}`, {
      method: "PATCH",
      body: { active: !product.active },
    });
    await load();
  }

  async function saveStock(product: Product, stock: number) {
    await api(`/admin/products/${product.id}`, { method: "PATCH", body: { stock } });
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <AdminNav />
      <h1 className="font-heading text-3xl font-semibold">Products</h1>
      <Card>
        <CardHeader>
          <CardTitle>Add product</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5" onSubmit={create}>
            <div className="space-y-2 md:col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>DP</Label>
              <Input
                type="number"
                value={form.dp}
                onChange={(e) => setForm({ ...form, dp: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>MRP</Label>
              <Input
                type="number"
                value={form.mrp}
                onChange={(e) => setForm({ ...form, mrp: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              />
            </div>
            <div className="md:col-span-5">
              <Button type="submit">Save product</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {!rows ? <p className="text-muted-foreground">Loading products…</p> : null}
      <ul className="space-y-2">
        {rows?.map((p) => (
          <li key={p.id} className="flex flex-col justify-between gap-3 rounded-xl border p-4 md:flex-row md:items-center">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted-foreground">
                DP {inr(p.dp)} · MRP {inr(p.mrp)} · {p.active ? "Active" : "Hidden"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                className="w-24"
                type="number"
                defaultValue={p.stock}
                onBlur={(e) => saveStock(p, Number(e.target.value))}
              />
              <Button variant="outline" onClick={() => toggle(p)}>
                {p.active ? "Hide" : "Show"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
