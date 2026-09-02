"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AdminNav } from "@/components/admin-nav";
import { api } from "@/lib/api";
import { formatDate, inr } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  async function load() {
    const data = await api<{ pending: Pending[]; recent: Issued[] }>("/admin/pins");
    setPending(data.pending);
    setRecent(data.recent);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, []);

  async function generate(id: string) {
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <AdminNav />
      <h1 className="font-heading text-3xl font-semibold">PIN generation queue</h1>
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
            <Button onClick={() => generate(row.id)}>Generate PIN</Button>
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
