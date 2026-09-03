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

type BankForm = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
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
  const [bankForm, setBankForm] = useState<BankForm>({
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
  });
  const [savingBank, setSavingBank] = useState(false);

  async function load() {
    const payload = await api<KycPayload>("/member/kyc");
    setData(payload);
    setPanNumber(payload.panNumber);
    await refresh();
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!member) return;
    setBankForm({
      accountName: member.accountName ?? "",
      bankName: member.bankName ?? "",
      accountNumber: member.accountNumber ?? "",
      ifsc: member.ifsc ?? "",
      upiId: member.upiId ?? "",
    });
  }, [member]);

  async function submitKyc(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/kyc/submit", { method: "POST", body: { panNumber, panImageUrl } });
      toast.success("KYC submitted for admin review");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit KYC");
    }
  }

  async function saveBank(e: FormEvent) {
    e.preventDefault();
    setSavingBank(true);
    try {
      await api("/member/bank", { method: "PATCH", body: bankForm });
      toast.success("Bank details saved");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save bank details");
    } finally {
      setSavingBank(false);
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
          <h1 className="font-heading text-3xl font-semibold">KYC &amp; bank</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit PAN for verification and save your payout bank account for weekly transfers.
          </p>
        </div>
        <Badge variant={data.kycStatus === "VERIFIED" ? "default" : "secondary"}>{data.kycStatus}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bank details for payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Weekly approved income is transferred to this account. Double-check account holder name, IFSC, and
            account number.
          </p>
          <form className="grid max-w-xl gap-3" onSubmit={saveBank}>
            {(
              [
                ["accountName", "Account holder name"],
                ["bankName", "Bank name"],
                ["accountNumber", "Account number"],
                ["ifsc", "IFSC"],
                ["upiId", "UPI ID (optional)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Input
                  value={bankForm[key]}
                  onChange={(e) =>
                    setBankForm({
                      ...bankForm,
                      [key]: key === "ifsc" ? e.target.value.toUpperCase() : e.target.value,
                    })
                  }
                  required={key !== "upiId"}
                />
              </div>
            ))}
            <Button type="submit" disabled={savingBank}>
              {savingBank ? "Saving…" : "Save bank details"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PAN KYC</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            PAN format is checked at submit. Admin reviews the document. Status is informational in this phase
            and does not block PIN, orders, or matching.
          </p>
          {pending ? (
            <p className="text-sm">A submission is already waiting for admin review.</p>
          ) : (
            <form className="space-y-4" onSubmit={submitKyc}>
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
          <CardTitle>KYC history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No KYC submissions yet.</p>
          ) : (
            data.submissions.map((row) => (
              <div key={row.id} className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-mono">{row.panNumber}</span>
                  <Badge variant={row.status === "VERIFIED" ? "default" : "secondary"}>{row.status}</Badge>
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
