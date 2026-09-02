"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AdminNav } from "@/components/admin-nav";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Config = {
  joiningAmount: number;
  pairValue: number;
  dailyPairCap: number;
  gstPercent: number;
  adminCutPercent: number;
  retailIncomePerUnit: number;
};

export default function ConfigPage() {
  return (
    <RequireAuth role="ADMIN">
      <Inner />
    </RequireAuth>
  );
}

type Company = {
  companyName: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  contactEmail: string;
  contactPhone: string;
};

function Inner() {
  const [form, setForm] = useState<Config | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    Promise.all([api<Config>("/admin/config"), api<Company>("/admin/company")])
      .then(([cfg, co]) => {
        setForm(cfg);
        setCompany({
          ...co,
          contactEmail: co.contactEmail ?? "",
          contactPhone: co.contactPhone ?? "",
        });
      })
      .catch((err) => toast.error(err.message));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    try {
      const saved = await api<Config>("/admin/config", { method: "PATCH", body: form });
      setForm(saved);
      toast.success("Plan values saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  if (!form) return <p className="px-4 py-16 text-center text-muted-foreground">Loading plan config…</p>;

  const fields: { key: keyof Config; label: string }[] = [
    { key: "joiningAmount", label: "Joining amount (₹)" },
    { key: "pairValue", label: "Pair value gross (₹)" },
    { key: "dailyPairCap", label: "Daily pair cap" },
    { key: "gstPercent", label: "GST % of gross" },
    { key: "adminCutPercent", label: "Admin cut % of gross" },
    { key: "retailIncomePerUnit", label: "Retail income per unit (₹)" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <AdminNav />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Plan config</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={save}>
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type="number"
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: Number(e.target.value) })}
                />
              </div>
            ))}
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
      {company ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Company collection bank</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const saved = await api<Company>("/admin/company", { method: "PATCH", body: company });
                  setCompany(saved);
                  toast.success("Company bank saved");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not save");
                }
              }}
            >
              {(
                [
                  ["companyName", "Company name"],
                  ["accountName", "Account holder"],
                  ["bankName", "Bank name"],
                  ["accountNumber", "Account number"],
                  ["ifsc", "IFSC"],
                  ["upiId", "UPI ID"],
                  ["contactEmail", "Public contact email"],
                  ["contactPhone", "Public contact phone"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    value={company[key]}
                    onChange={(e) => setCompany({ ...company, [key]: e.target.value })}
                  />
                </div>
              ))}
              <Button type="submit">Save bank</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
