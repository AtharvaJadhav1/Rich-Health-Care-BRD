"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SetupResult = {
  admin: { phone: string; memberCode: string };
  root: { name: string; phone: string; memberCode: string; password: string };
};

export default function SetupPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [form, setForm] = useState({
    companyName: "Rich Health Care Solution",
    adminName: "",
    adminPhone: "",
    adminPassword: "",
    adminPan: "",
    rootName: "",
    rootPhone: "",
    rootPan: "",
  });

  useEffect(() => {
    api<{ needsSetup: boolean }>("/public/status")
      .then((s) => {
        if (!s.needsSetup) router.replace("/login");
      })
      .catch(() => {});
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api<SetupResult>("/setup", { method: "POST", body: form });
      setResult(data);
      toast.success("Live platform created. Save the first distributor password.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 py-16">
        <h1 className="font-heading text-3xl font-semibold">Platform is live</h1>
        <p className="text-sm text-muted-foreground">
          There are no demo logins. Save the first distributor password now — it is shown only once.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Phone <span className="font-mono">{result.admin.phone}</span> · ID{" "}
              <span className="font-mono">{result.admin.memberCode}</span>
            </p>
            <p>Sign in with the admin password you just chose.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>First distributor (company ID)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Member ID <span className="font-mono font-medium">{result.root.memberCode}</span>
            </p>
            <p>
              Phone <span className="font-mono">{result.root.phone}</span>
            </p>
            <p>
              Password <span className="font-mono font-medium">{result.root.password}</span>
            </p>
            <p className="text-muted-foreground">
              New members join under this ID until they have their own. Admin can add company bank details later
              from Plan config and approve UTR payments from the dashboard.
            </p>
          </CardContent>
        </Card>
        <Button onClick={() => router.push("/login")}>Go to sign in</Button>
      </div>
    );
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm({ ...form, [key]: value });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-16">
      <div>
        <h1 className="font-heading text-3xl font-semibold">First-time setup</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This runs once. It creates the real admin and the first live distributor ID. No sample members.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field label="Company name" value={form.companyName} onChange={(v) => set("companyName", v)} />
            <Field label="Admin full name" value={form.adminName} onChange={(v) => set("adminName", v)} />
            <Field label="Admin 10-digit phone" value={form.adminPhone} onChange={(v) => set("adminPhone", v)} />
            <Field
              label="Admin password (min 8 characters)"
              type="password"
              value={form.adminPassword}
              onChange={(v) => set("adminPassword", v)}
            />
            <Field label="Admin PAN" value={form.adminPan} onChange={(v) => set("adminPan", v.toUpperCase())} />
            <Field
              label="First distributor name"
              value={form.rootName}
              onChange={(v) => set("rootName", v)}
            />
            <Field
              label="First distributor 10-digit phone"
              value={form.rootPhone}
              onChange={(v) => set("rootPhone", v)}
            />
            <Field label="First distributor PAN" value={form.rootPan} onChange={(v) => set("rootPan", v.toUpperCase())} />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Create live platform"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}
