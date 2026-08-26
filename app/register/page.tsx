"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    sponsorCode: "RHC0001",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await register(form);
      toast.success("Account created. Submit your ₹999 joining payment next.");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Become a distributor</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A sponsor code is required and must belong to an active member. Your left/right slot is reserved on
          submit. Wallet credits wait until the joining payment is approved.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field label="Full name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
            <Field
              label="10-digit phone"
              value={form.phone}
              onChange={(phone) => setForm({ ...form, phone })}
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={(password) => setForm({ ...form, password })}
            />
            <Field
              label="Sponsor code"
              value={form.sponsorCode}
              onChange={(sponsorCode) => setForm({ ...form, sponsorCode })}
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="text-primary">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}
