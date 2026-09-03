"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { PageHero, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Position = "LEFT" | "RIGHT";

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="px-4 py-16 text-center text-muted-foreground">Loading…</p>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [memberCode, setMemberCode] = useState<string | null>(null);
  const [form, setForm] = useState({
    sponsorCode: "",
    placementCode: "",
    position: "LEFT" as Position,
    name: "",
    dateOfBirth: "",
    phone: "",
    password: "",
    confirmPassword: "",
    panNumber: "",
    at: "",
    city: "",
    state: "",
    agreeTerms: false,
  });

  useEffect(() => {
    api<{ needsSetup: boolean }>("/public/status")
      .then((s) => {
        if (s.needsSetup) router.replace("/setup");
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    const sponsor = searchParams.get("sponsor")?.trim().toUpperCase();
    const placement = searchParams.get("placement")?.trim().toUpperCase();
    const position = searchParams.get("position")?.trim().toUpperCase();
    if (!sponsor && !placement && position !== "LEFT" && position !== "RIGHT") return;
    setForm((current) => ({
      ...current,
      ...(sponsor ? { sponsorCode: sponsor } : {}),
      ...(placement ? { placementCode: placement } : {}),
      ...(position === "LEFT" || position === "RIGHT" ? { position } : {}),
    }));
  }, [searchParams]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm({ ...form, [key]: value });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Password and confirm password do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await register({
        name: form.name,
        phone: form.phone,
        panNumber: form.panNumber,
        password: form.password,
        sponsorCode: form.sponsorCode,
        placementCode: form.placementCode,
        position: form.position,
        dateOfBirth: form.dateOfBirth,
        at: form.at,
        city: form.city,
        state: form.state,
        agreeTerms: true,
      });
      setMemberCode(result.credentials.memberCode);
      toast.success("Registration submitted. Save your Member ID.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register");
    } finally {
      setBusy(false);
    }
  }

  if (memberCode) {
    return (
      <PageShell className="max-w-lg">
        <PageHero
          title="Registration complete"
          description="Your Member ID is issued below. Login with the password you chose. Complete joining payment from the dashboard."
        />
        <Card>
          <CardHeader>
            <CardTitle>Your Member ID</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              Member ID: <span className="font-mono font-medium">{memberCode}</span>
            </p>
            <Button className="w-full" onClick={() => router.push("/dashboard")}>
              Continue to dashboard
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-lg">
      <PageHero
        title="Registration"
        description="Fill every field. Placement side must be empty under the placement ID you enter. Open slots on your tree diagram pre-fill sponsor, placement, and left/right position."
      />
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field
              label="Sponsor ID"
              value={form.sponsorCode}
              onChange={(v) => set("sponsorCode", v.toUpperCase())}
            />
            <Field
              label="Placement ID"
              value={form.placementCode}
              onChange={(v) => set("placementCode", v.toUpperCase())}
            />
            <div className="space-y-2">
              <Label>Select position</Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="position"
                    checked={form.position === "LEFT"}
                    onChange={() => set("position", "LEFT")}
                  />
                  Left
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="position"
                    checked={form.position === "RIGHT"}
                    onChange={() => set("position", "RIGHT")}
                  />
                  Right
                </label>
              </div>
            </div>
            <Field label="Full name" value={form.name} onChange={(v) => set("name", v)} />
            <Field
              label="Date of birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(v) => set("dateOfBirth", v)}
            />
            <Field
              label="Mobile number"
              value={form.phone}
              onChange={(v) => set("phone", v.replace(/\D/g, "").slice(0, 10))}
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => set("password", v)}
            />
            <Field
              label="Confirm password"
              type="password"
              value={form.confirmPassword}
              onChange={(v) => set("confirmPassword", v)}
            />
            <Field
              label="PAN card number"
              value={form.panNumber}
              onChange={(v) => set("panNumber", v.toUpperCase())}
            />
            <Field label="At (locality / village)" value={form.at} onChange={(v) => set("at", v)} />
            <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
            <Field label="State" value={form.state} onChange={(v) => set("state", v)} />
            <label className="flex items-start gap-2 text-sm leading-relaxed">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.agreeTerms}
                onChange={(e) => set("agreeTerms", e.target.checked)}
                required
              />
              <span>I agree to the terms and conditions and privacy policy.</span>
            </label>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <p className="mt-6 text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="text-primary">
          Login
        </Link>
      </p>
    </PageShell>
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
  const id = label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}
