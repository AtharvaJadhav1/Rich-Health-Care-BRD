"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/components/auth-provider";
import { isActiveMemberStatus } from "@/lib/member-status";
import { PageHero, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyPinPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { member } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!member) return;
    if (isActiveMemberStatus(member.status)) {
      router.replace("/dashboard");
    }
  }, [member, router]);

  if (!member) {
    return <p className="px-4 py-16 text-center text-muted-foreground">Loading…</p>;
  }

  return (
    <PageShell narrow>
      <PageHero
        title="Awaiting admin activation"
        description="PIN activation is handled by admin. After registration you show as Red on the tree until admin verifies your PIN."
      />
      <Card>
        <CardHeader>
          <CardTitle>Member ID {member.memberCode}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your account status is <span className="font-medium text-red-600">Red</span>. Contact admin to activate
            your PIN. Once activated, your status becomes <span className="font-medium text-emerald-600">Green</span>.
          </p>
          <Button className="w-full" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
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
