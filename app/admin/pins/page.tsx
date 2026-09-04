"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AdminNav } from "@/components/admin-nav";
import { api } from "@/lib/api";
import { formatDate, inr } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Pending = {
  id: string;
  amount: number;
  referenceNo: string;
  createdAt: string;
  member: { name: string; memberCode: string; phone: string };
};

type Issued = {
  id: string;
  code: string;
  status: string;
  assignedMemberCode?: string | null;
  createdAt: string;
  owner: { name: string; memberCode: string };
};

export default function AdminPinsPage() {
  return (
    <RequireAuth role="ADMIN">
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [pending, setPending] = useState<Pending[] | null>(null);
  const [recent, setRecent] = useState<Issued[]>([]);
  const [genCount, setGenCount] = useState(1);
  const [assignCode, setAssignCode] = useState("");
  const [generating, setGenerating] = useState(false);

  async function load() {
    const data = await api<{ pending: Pending[]; recent: Issued[] }>("/admin/pins");
    setPending(data.pending);
    setRecent(data.recent);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, []);

  async function generateFromPayment(id: string) {
    try {
      const res = await api<{ pin: { code: string } }>(`/admin/payments/${id}/approve`, {
        method: "PATCH",
        body: {},
      });
      toast.success(`PIN issued: ${res.pin.code}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate PIN");
    }
  }

  async function directGenerate(e: FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api<{ pins: { code: string }[] }>("/admin/pins/generate", {
        method: "POST",
        body: {
          count: genCount,
          ...(assignCode.trim() ? { memberCode: assignCode.trim().toUpperCase() } : {}),
        },
      });
      toast.success(`Generated: ${res.pins.map((p) => p.code).join(", ")}`);
      setAssignCode("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate PINs");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <AdminNav />
      <h1 className="font-heading text-3xl font-semibold">PIN generation</h1>
      <Card>
        <CardHeader>
          <CardTitle>Generate PINs directly</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={directGenerate}>
            <div className="space-y-2">
              <Label htmlFor="genCount">How many</Label>
              <Input
                id="genCount"
                type="number"
                min={1}
                max={50}
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
                required
              />
            </div>
            <div className="grow space-y-2">
              <Label htmlFor="assignCode">Assign to Member ID (optional)</Label>
              <Input
                id="assignCode"
                value={assignCode}
                onChange={(e) => setAssignCode(e.target.value.toUpperCase())}
                placeholder="Leave blank for open PINs"
              />
            </div>
            <Button type="submit" disabled={generating}>
              {generating ? "Generating…" : "Generate PINs"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <h2 className="text-lg font-medium">PIN payment queue</h2>
      {pending?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-muted-foreground">No PIN payments waiting.</CardContent>
        </Card>
      ) : null}
      {pending?.map((row) => (
        <Card key={row.id}>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>
                {row.member.name} · {row.member.memberCode}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {inr(row.amount)} · UTR {row.referenceNo} · {formatDate(row.createdAt)}
              </p>
            </div>
            <Badge>PIN</Badge>
          </CardHeader>
          <CardContent>
            <Button onClick={() => generateFromPayment(row.id)}>Generate PIN</Button>
          </CardContent>
        </Card>
      ))}
      <div>
        <h2 className="mb-3 text-lg font-medium">Recently issued</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No PINs issued yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((pin) => (
              <li key={pin.id} className="flex justify-between rounded-lg border px-3 py-2">
                <span>
                  <span className="font-mono">{pin.code}</span> · {pin.owner.name} ({pin.owner.memberCode})
                  {pin.assignedMemberCode ? ` · for ${pin.assignedMemberCode}` : ""}
                </span>
                <Badge variant={pin.status === "UNUSED" ? "secondary" : "default"}>{pin.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
