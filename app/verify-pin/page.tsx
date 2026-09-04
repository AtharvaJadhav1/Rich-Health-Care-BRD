"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";

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
  const [pendingPin, setPendingPin] = useState<{ code: string } | null>(null);

  useEffect(() => {
    if (!member) return;
    setMemberCode(member.memberCode);
    if (isActiveMemberStatus(member.status)) {
      router.replace("/dashboard");
      return;
    }
    api<{ pending: { code: string } | null }>("/member/pin-activation")
      .then((data) => setPendingPin(data.pending))
      .catch(() => {});
  }, [member, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/verify-pin", {
        method: "POST",
        body: { memberCode: memberCode.trim().toUpperCase(), pinCode },
      });
      toast.success("PIN submitted. Admin will review and approve your activation.");
      const data = await api<{ pending: { code: string } | null }>("/member/pin-activation");
      setPendingPin(data.pending);
      setPinCode("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit PIN");
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
        title="Submit your PIN"
        description="Enter the PIN shared by admin or your sponsor. Your account stays Red until admin approves — then you turn Green."
      />
      {pendingPin ? (
        <Card className="border-amber-500/40 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-amber-900">Awaiting admin approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              PIN <span className="font-mono font-medium">{pendingPin.code}</span> is submitted and waiting for admin
              to approve.
            </p>
            <Badge variant="secondary">Pending approval</Badge>
          </CardContent>
        </Card>
      ) : (
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
                  placeholder="Enter PIN from admin"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Submitting…" : "Submit PIN for activation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      <Button className="w-full" variant="outline" onClick={() => router.push("/dashboard")}>
        Back to dashboard
      </Button>
      <p className="text-sm text-muted-foreground">
        Need help?{" "}
        <Link href="/contact" className="text-primary">
          Contact support
        </Link>
      </p>
    </PageShell>
  );
}
