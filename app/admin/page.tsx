"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AdminNav } from "@/components/admin-nav";
import { api, downloadCsv } from "@/lib/api";
import { formatDate, inr } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Payment = {
  id: string;
  purpose: string;
  amount: number;
  referenceNo: string;
  screenshotUrl: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  member: { name: string; memberCode: string; phone: string; status?: string };
};

export default function AdminPaymentsPage() {
  return (
    <RequireAuth role="ADMIN">
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [pending, setPending] = useState<Payment[] | null>(null);
  const [history, setHistory] = useState<Payment[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [p, h] = await Promise.all([
        api<Payment[]>("/admin/payments/pending"),
        api<Payment[]>("/admin/payments"),
      ]);
      setPending(p);
      setHistory(h);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payments");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    try {
      await api(`/admin/payments/${id}/approve`, { method: "PATCH", body: {} });
      toast.success("Payment approved");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed");
    }
  }

  async function reject(id: string, e: FormEvent) {
    e.preventDefault();
    try {
      await api(`/admin/payments/${id}/reject`, {
        method: "PATCH",
        body: { adminNote: notes[id] ?? "" },
      });
      toast.success("Payment rejected");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reject failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <AdminNav />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Pending payments</h1>
          <p className="text-sm text-muted-foreground">
            Approve joining fees and orders here. Binary counts and wallet credits start only after approval.
          </p>
        </div>
        <Button variant="outline" onClick={() => downloadCsv("/admin/payments/export", "payments.csv")}>
          Export CSV
        </Button>
      </div>
      {error ? <p className="text-destructive">{error}</p> : null}
      {pending && pending.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-muted-foreground">
            No payments waiting. New UTRs will land in this queue.
          </CardContent>
        </Card>
      ) : null}
      <div className="space-y-4">
        {pending?.map((p) => (
          <Card key={p.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>
                  {p.member.name} · {p.member.memberCode}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {p.purpose} · {inr(p.amount)} · UTR {p.referenceNo}
                </p>
              </div>
              <Badge>{p.purpose}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
              <Button onClick={() => approve(p.id)}>Approve</Button>
              <form className="flex flex-1 flex-col gap-2 md:flex-row" onSubmit={(e) => reject(p.id, e)}>
                <Textarea
                  placeholder="Rejection note for the member"
                  value={notes[p.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })}
                  required
                />
                <Button type="submit" variant="destructive">
                  Reject
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <h2 className="mb-3 text-lg font-medium">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviewed payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Member</th>
                  <th>Purpose</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2">{formatDate(p.createdAt)}</td>
                    <td>
                      {p.member.name} ({p.member.memberCode})
                    </td>
                    <td>{p.purpose}</td>
                    <td>{inr(p.amount)}</td>
                    <td>{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
