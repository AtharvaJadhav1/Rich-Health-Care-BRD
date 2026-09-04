"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { isActiveMemberStatus } from "@/lib/member-status";
import { PageHero, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyPinPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { member, refresh } = useAuth();
  const router = useRouter();
  const [memberCode, setMemberCode] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!member) return;
    setMemberCode(member.memberCode);
    if (isActiveMemberStatus(member.status)) {
      router.replace("/dashboard");
    }
  }, [member, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/verify-pin", {
        method: "POST",
        body: { memberCode: memberCode.trim().toUpperCase(), pinCode },
      });
      await refresh();
      toast.success("PIN verified. Your account is now Green.");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PIN verification failed");
    } finally {
      setBusy(false);
    }
  }

  if (!member) {
    return <p className="px-4 py-16 text-center text-muted-foreground">Loading…</p>;
  }

  return (
    <PageShell narrow>
      <PageHero
        title="Verify your PIN"
        description="Registration is free. Enter the Member ID issued to you and the PIN from your sponsor or admin to activate your account (Green status)."
      />
      <Card>
        <CardHeader>
          <CardTitle>Member ID and PIN</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="memberCode">Member ID</Label>
              <Input
                id="memberCode"
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pinCode">PIN</Label>
              <Input
                id="pinCode"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.toUpperCase())}
                placeholder="Enter your activation PIN"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Verifying…" : "Verify and activate"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Need help?{" "}
        <Link href="/contact" className="text-primary">
          Contact support
        </Link>
      </p>
    </PageShell>
  );
}
