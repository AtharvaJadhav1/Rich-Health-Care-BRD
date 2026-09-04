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
  const [activateOnGenerate, setActivateOnGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activateCodes, setActivateCodes] = useState<Record<string, string>>({});

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
      const memberCode = assignCode.trim().toUpperCase();
      const res = await api<{
        pins: { code: string }[];
        activated?: { code: string };
        member?: { status: string; memberCode: string };
      }>("/admin/pins/generate", {
        method: "POST",
        body: {
          count: genCount,
          ...(memberCode ? { memberCode } : {}),
          ...(activateOnGenerate && memberCode ? { activate: true } : {}),
        },
      });
      if (res.activated && res.member) {
        toast.success(
          `Generated ${res.pins.map((p) => p.code).join(", ")} and activated ${res.member.memberCode} — Green`,
        );
      } else {
        toast.success(`Generated: ${res.pins.map((p) => p.code).join(", ")}`);
      }
      setAssignCode("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate PINs");
    } finally {
      setGenerating(false);
    }
  }

  async function activatePin(pinId: string, pinCode: string) {
    const memberCode = activateCodes[pinId]?.trim().toUpperCase();
    if (!memberCode) {
      toast.error("Enter the Member ID to activate.");
      return;
    }
    try {
      const res = await api<{ member: { memberCode: string; status: string } }>(
        `/admin/pins/${pinId}/activate`,
        { method: "POST", body: { memberCode } },
      );
      toast.success(`PIN ${pinCode} activated for ${res.member.memberCode} — ${res.member.status}`);
      setActivateCodes((current) => ({ ...current, [pinId]: "" }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not activate PIN");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <AdminNav />
      <h1 className="font-heading text-3xl font-semibold">PIN generation & activation</h1>
      <Card>
        <CardHeader>
          <CardTitle>Generate PINs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                placeholder="RHC4267"
              />
            </div>
            <Button type="submit" disabled={generating}>
              {generating ? "Working…" : "Generate PINs"}
            </Button>
          </form>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activateOnGenerate}
              onChange={(e) => setActivateOnGenerate(e.target.checked)}
            />
            Activate member immediately (requires Member ID above — turns account Green)
          </label>
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
        <h2 className="mb-3 text-lg font-medium">Recently issued — activate for a member</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No PINs issued yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((pin) => (
              <li key={pin.id} className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="font-mono font-medium">{pin.code}</span> · {pin.owner.name} ({pin.owner.memberCode})
                  {pin.assignedMemberCode ? ` · for ${pin.assignedMemberCode}` : ""}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={pin.status === "UNUSED" ? "secondary" : "default"}>{pin.status}</Badge>
                  {pin.status === "UNUSED" ? (
                    <>
                      <Input
                        className="h-8 w-32"
                        placeholder="Member ID"
                        value={activateCodes[pin.id] ?? pin.assignedMemberCode ?? ""}
                        onChange={(e) =>
                          setActivateCodes((current) => ({
                            ...current,
                            [pin.id]: e.target.value.toUpperCase(),
                          }))
                        }
                      />
                      <Button size="sm" onClick={() => activatePin(pin.id, pin.code)}>
                        Activate
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
