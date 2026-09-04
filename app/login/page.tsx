"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { PageHero, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [memberCode, setMemberCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ needsSetup: boolean }>("/public/status")
      .then((s) => {
        if (s.needsSetup) router.replace("/setup");
      })
      .catch(() => {});
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const member = await login(memberCode, password);
      toast.success("Signed in");
      if (member.role === "ADMIN") router.push("/admin");
      else if (member.role === "SUPPORT") router.push("/admin/members");
      else if (member.status === "PENDING_PIN") router.push("/dashboard");
      else router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell narrow>
      <PageHero
        title="Login"
        description="Use the Member ID and password issued at registration. Passwords are case-sensitive."
      />
      <Card>
        <CardHeader>
          <CardTitle>Member ID and password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="memberCode">Member ID</Label>
              <Input
                id="memberCode"
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Logging in…" : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        New distributor?{" "}
        <Link href="/register" className="text-primary">
          Register
        </Link>
      </p>
    </PageShell>
  );
}
