"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AdminNav } from "@/components/admin-nav";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Row = {
  id: string;
  panNumber: string;
  panImageUrl: string;
  status: string;
  createdAt: string;
  member: { name: string; memberCode: string; phone: string };
};

export default function AdminKycPage() {
  return (
    <RequireAuth role="ADMIN">
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load() {
    setRows(await api<Row[]>("/admin/kyc/pending"));
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, []);

  async function approve(id: string) {
    try {
      await api(`/admin/kyc/${id}/approve`, { method: "PATCH", body: {} });
      toast.success("KYC verified");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed");
    }
  }

  async function reject(id: string, e: FormEvent) {
    e.preventDefault();
    try {
      await api(`/admin/kyc/${id}/reject`, {
        method: "PATCH",
        body: { adminNote: notes[id] ?? "" },
      });
      toast.success("KYC rejected");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reject failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <AdminNav />
      <h1 className="font-heading text-3xl font-semibold">KYC queue</h1>
      {rows?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-muted-foreground">No KYC waiting.</CardContent>
        </Card>
      ) : null}
      {rows?.map((row) => (
        <Card key={row.id}>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>
                {row.member.name} · {row.member.memberCode}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                PAN {row.panNumber} · {formatDate(row.createdAt)}
              </p>
            </div>
            <Badge>PENDING</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href={row.panImageUrl} className="text-sm text-primary underline" target="_blank" rel="noreferrer">
              Open PAN document
            </a>
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <Button onClick={() => approve(row.id)}>Approve</Button>
              <form className="flex flex-1 flex-col gap-2 md:flex-row" onSubmit={(e) => reject(row.id, e)}>
                <Textarea
                  placeholder="Rejection note"
                  value={notes[row.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [row.id]: e.target.value })}
                  required
                />
                <Button type="submit" variant="destructive">
                  Reject
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
