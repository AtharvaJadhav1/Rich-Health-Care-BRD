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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  usedAt?: string | null;
  createdAt: string;
  owner: { name: string; memberCode: string };
};

type UnusedPin = {
  id: string;
  code: string;
  status: string;
  assignedMemberCode?: string | null;
  createdAt: string;
  transferredFrom?: { memberCode: string; name: string; at: string } | null;
};

type AllUnusedPin = UnusedPin & {
  owner: { name: string; memberCode: string };
};

type ActivationRow = {
  pin: Issued;
  member: { id: string; name: string; memberCode: string; phone: string; status: string } | null;
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
  const [activationQueue, setActivationQueue] = useState<ActivationRow[]>([]);
  const [myUnused, setMyUnused] = useState<UnusedPin[]>([]);
  const [allUnused, setAllUnused] = useState<AllUnusedPin[]>([]);
  const [genCount, setGenCount] = useState(10);
  const [assignCode, setAssignCode] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedBatch, setGeneratedBatch] = useState<{ code: string; id: string }[]>([]);
  const [transferCodes, setTransferCodes] = useState<Record<string, string>>({});

  async function load() {
    const data = await api<{
      pending: Pending[];
      activationQueue: ActivationRow[];
      myUnused: UnusedPin[];
      allUnused: AllUnusedPin[];
    }>("/admin/pins");
    setPending(data.pending);
    setActivationQueue(data.activationQueue);
    setMyUnused(data.myUnused);
    setAllUnused(data.allUnused);
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
      const res = await api<{ pins: { code: string; id: string }[] }>("/admin/pins/generate", {
        method: "POST",
        body: {
          count: genCount,
          ...(memberCode ? { memberCode } : {}),
        },
      });
      setGeneratedBatch(res.pins);
      toast.success(`Generated ${res.pins.length} PIN(s). Share or transfer them to members.`);
      setAssignCode("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate PINs");
    } finally {
      setGenerating(false);
    }
  }

  async function approveActivation(pinId: string, pinCode: string, memberCode: string) {
    try {
      await api(`/admin/pins/${pinId}/approve`, { method: "PATCH", body: {} });
      toast.success(`Approved PIN ${pinCode} for ${memberCode} — now Green`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve");
    }
  }

  async function rejectActivation(pinId: string) {
    try {
      await api(`/admin/pins/${pinId}/reject`, { method: "PATCH", body: {} });
      toast.success("PIN activation rejected");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reject");
    }
  }

  async function transferPin(pinId: string) {
    const memberCode = transferCodes[pinId]?.trim().toUpperCase();
    if (!memberCode) {
      toast.error("Enter recipient Member ID.");
      return;
    }
    try {
      await api(`/admin/pins/${pinId}/transfer`, { method: "POST", body: { memberCode } });
      toast.success(`PIN transferred to ${memberCode}`);
      setTransferCodes((current) => ({ ...current, [pinId]: "" }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not transfer PIN");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <AdminNav />
      <h1 className="font-heading text-3xl font-semibold">PIN management</h1>

      <Tabs defaultValue="generate">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="generate">PIN generation</TabsTrigger>
          <TabsTrigger value="activation">
            PIN activation
            {activationQueue.length > 0 ? (
              <Badge className="ml-2 h-5 px-1.5" variant="destructive">
                {activationQueue.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="payments">PIN payments</TabsTrigger>
          <TabsTrigger value="unused">Unused PINs</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate PINs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create up to 50 PINs at once. Share codes with members or transfer them from the inventory tab.
                Members submit a PIN for activation; you approve under PIN activation.
              </p>
              <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={directGenerate}>
                <div className="space-y-2">
                  <Label htmlFor="genCount">How many PINs</Label>
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
                  <Label htmlFor="assignCode">Pre-assign to Member ID (optional)</Label>
                  <Input
                    id="assignCode"
                    value={assignCode}
                    onChange={(e) => setAssignCode(e.target.value.toUpperCase())}
                    placeholder="RHC4267"
                  />
                </div>
                <Button type="submit" disabled={generating}>
                  {generating ? "Generating…" : "Generate PINs"}
                </Button>
              </form>
            </CardContent>
          </Card>
          {generatedBatch.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Last generated batch ({generatedBatch.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {generatedBatch.map((pin) => (
                    <li key={pin.id} className="rounded-lg border px-3 py-2 font-mono text-sm">
                      {pin.code}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="activation" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending PIN activations</CardTitle>
            </CardHeader>
            <CardContent>
              {activationQueue.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No members waiting. When a user submits a PIN, they appear here for your approval.
                </p>
              ) : (
                <ul className="space-y-3">
                  {activationQueue.map((row) => (
                    <li key={row.pin.id} className="rounded-lg border p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-medium">
                            {row.member?.name ?? "Unknown"} · {row.member?.memberCode}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {row.member?.phone} · status {row.member?.status}
                          </p>
                          <p className="mt-2 font-mono text-sm">
                            PIN: <span className="font-semibold">{row.pin.code}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PIN owner: {row.owner.name} ({row.owner.memberCode}) · submitted{" "}
                            {row.pin.usedAt ? formatDate(row.pin.usedAt) : "recently"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() =>
                              approveActivation(
                                row.pin.id,
                                row.pin.code,
                                row.member?.memberCode ?? "",
                              )
                            }
                          >
                            Approve → Green
                          </Button>
                          <Button variant="outline" onClick={() => rejectActivation(row.pin.id)}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4 pt-4">
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
                <Badge>PIN payment</Badge>
              </CardHeader>
              <CardContent>
                <Button onClick={() => generateFromPayment(row.id)}>Generate PIN from payment</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="unused" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Your unused PINs ({myUnused.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {myUnused.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No unused PINs in your account. Generate PINs above, then transfer them to members.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {myUnused.map((pin) => (
                    <li
                      key={pin.id}
                      className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span>
                        <span className="font-mono font-medium">{pin.code}</span>
                        {pin.assignedMemberCode ? ` · for ${pin.assignedMemberCode}` : ""}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">UNUSED</Badge>
                        <Input
                          className="h-8 w-32"
                          placeholder="Transfer to"
                          value={transferCodes[pin.id] ?? ""}
                          onChange={(e) =>
                            setTransferCodes((current) => ({
                              ...current,
                              [pin.id]: e.target.value.toUpperCase(),
                            }))
                          }
                        />
                        <Button size="sm" variant="outline" onClick={() => transferPin(pin.id)}>
                          Transfer
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All unused PINs in system ({allUnused.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Includes PINs transferred to members — they appear here until used or submitted for activation.
              </p>
              {allUnused.length === 0 ? (
                <p className="text-sm text-muted-foreground">No unused PINs in the system.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {allUnused.map((pin) => (
                    <li key={pin.id} className="flex flex-col gap-1 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        <span className="font-mono font-medium">{pin.code}</span> · held by {pin.owner.name} (
                        {pin.owner.memberCode})
                        {pin.assignedMemberCode ? ` · for ${pin.assignedMemberCode}` : ""}
                      </span>
                      <Badge variant="secondary">UNUSED</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
