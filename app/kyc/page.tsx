"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type KycPayload = {
  kycStatus: string;
  panNumber: string;
  submissions: {
    id: string;
    panNumber: string;
    status: string;
    adminNote: string | null;
    createdAt: string;
  }[];
};

export default function KycPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { member, refresh } = useAuth();
  const [data, setData] = useState<KycPayload | null>(null);
  const [panNumber, setPanNumber] = useState("");
  const [panImageUrl, setPanImageUrl] = useState("");

  async function load() {
    const payload = await api<KycPayload>("/member/kyc");
    setData(payload);
    setPanNumber(payload.panNumber);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/kyc/submit", { method: "POST", body: { panNumber, panImageUrl } });
      toast.success("KYC submitted for admin review");
      await load();
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit KYC");
    }
  }

  if (!member || !data) {
    return <p className="px-4 py-16 text-center text-muted-foreground">Loading KYC…</p>;
  }

  const pending = data.submissions.some((s) => s.status === "PENDING");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">KYC</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            PAN format is checked at submit. Admin reviews the document. Status is informational in
            this phase and does not block PIN, orders, or matching.
          </p>
        </div>
        <Badge variant={data.kycStatus === "VERIFIED" ? "default" : "secondary"}>
          {data.kycStatus}
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Submit documents</CardTitle>
        </CardHeader>
        <CardContent>
          {pending ? (
            <p className="text-sm">A submission is already waiting for admin review.</p>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="pan">PAN number</Label>
                <Input
                  id="pan"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="img">PAN card image URL</Label>
                <Input
                  id="img"
                  value={panImageUrl}
                  onChange={(e) => setPanImageUrl(e.target.value)}
                  placeholder="https://…"
                  required
                />
              </div>
              <Button type="submit">Submit KYC</Button>
            </form>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No KYC submissions yet.</p>
          ) : (
            data.submissions.map((row) => (
              <div key={row.id} className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-mono">{row.panNumber}</span>
                  <Badge variant={row.status === "VERIFIED" ? "default" : "secondary"}>
                    {row.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{formatDate(row.createdAt)}</p>
                {row.adminNote ? <p>Admin: {row.adminNote}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
