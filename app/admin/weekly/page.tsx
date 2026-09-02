"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AdminNav } from "@/components/admin-nav";
import { api, downloadCsv } from "@/lib/api";
import { inr } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type TeamRow = {
  name: string;
  memberCode: string;
  status: string;
  joiningPaymentStatus: string | null;
  generatedAmount: number;
  position: string | null;
};

type WeeklyRow = {
  id: string;
  memberId: string;
  weekStart: string;
  weekEnd: string;
  generatedAmount: number;
  matchingAmount: number;
  retailAmount: number;
  downlineTotal: number;
  downlineActive: number;
  downlinePending: number;
  teamReport: string;
  status: string;
  adminNote: string | null;
  member: {
    name: string;
    memberCode: string;
    phone: string;
    status: string;
    accountName: string | null;
    bankName: string | null;
    accountNumber: string | null;
    ifsc: string | null;
    upiId: string | null;
  };
};

export default function WeeklyPayoutsPage() {
  return (
    <RequireAuth role="ADMIN">
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [rows, setRows] = useState<WeeklyRow[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setRows(await api<WeeklyRow[]>("/admin/weekly-payouts"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load weekly reports");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function generate() {
    setBusy(true);
    try {
      const result = await api<{ created: number; skipped: number; weekStart: string; weekEnd: string }>(
        "/admin/weekly-payouts/generate",
        { method: "POST", body: {} },
      );
      toast.success(
        `Week ${result.weekStart} → ${result.weekEnd}: ${result.created} reports created, ${result.skipped} already existed`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate reports");
    } finally {
      setBusy(false);
    }
  }

  async function approve(id: string) {
    try {
      await api(`/admin/weekly-payouts/${id}/approve`, { method: "PATCH", body: {} });
      toast.success("Weekly payout approved and deducted from wallet");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed");
    }
  }

  async function reject(id: string, e: FormEvent) {
    e.preventDefault();
    try {
      await api(`/admin/weekly-payouts/${id}/reject`, {
        method: "PATCH",
        body: { adminNote: notes[id] ?? "" },
      });
      toast.success("Weekly payout held");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reject failed");
    }
  }

  const pending = rows?.filter((r) => r.status === "PENDING") ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <AdminNav />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Weekly payout reports</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Generate one report per member for this Monday–Sunday week (IST). Review team size, payment status, and
            amount generated, then approve to release the weekly payout.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadCsv("/admin/weekly-payouts/export", "weekly-payouts.csv")}>
            Export CSV
          </Button>
          <Button onClick={generate} disabled={busy}>
            {busy ? "Generating…" : "Generate this week's reports"}
          </Button>
        </div>
      </div>
      {error ? <p className="text-destructive">{error}</p> : null}
      {pending.length === 0 && rows?.length ? (
        <Card>
          <CardContent className="py-8 text-muted-foreground">
            No pending weekly payouts. Generate this week if reports are missing, or review history below.
          </CardContent>
        </Card>
      ) : null}
      <div className="space-y-4">
        {pending.map((row) => (
          <ReportCard
            key={row.id}
            row={row}
            notes={notes}
            setNotes={setNotes}
            open={openId === row.id}
            onToggle={() => setOpenId(openId === row.id ? null : row.id)}
            onApprove={() => approve(row.id)}
            onReject={(e) => reject(row.id, e)}
          />
        ))}
      </div>
      <div>
        <h2 className="mb-3 text-lg font-medium">All weekly reports</h2>
        {!rows ? <p className="text-muted-foreground">Loading…</p> : null}
        {rows?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports yet. Run matching, then generate this week.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Week</th>
                  <th>Member</th>
                  <th>Generated</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows?.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="py-2">
                      {row.weekStart} → {row.weekEnd}
                    </td>
                    <td>
                      {row.member.name} ({row.member.memberCode})
                    </td>
                    <td>{inr(row.generatedAmount)}</td>
                    <td>
                      {row.downlineTotal} total · {row.downlineActive} active
                    </td>
                    <td>
                      <Badge variant={row.status === "APPROVED" ? "default" : "secondary"}>{row.status}</Badge>
                    </td>
                    <td className="text-right">
                      <Link href={`/admin/members/${row.memberId}`} className="text-primary underline">
                        Full report
                      </Link>
                    </td>
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

function ReportCard({
  row,
  notes,
  setNotes,
  open,
  onToggle,
  onApprove,
  onReject,
}: {
  row: WeeklyRow;
  notes: Record<string, string>;
  setNotes: (v: Record<string, string>) => void;
  open: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: (e: FormEvent) => void;
}) {
  const team: TeamRow[] = (() => {
    try {
      return JSON.parse(row.teamReport) as TeamRow[];
    } catch {
      return [];
    }
  })();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>
            {row.member.name} · {row.member.memberCode}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {row.weekStart} → {row.weekEnd} · generated {inr(row.generatedAmount)} (matching {inr(row.matchingAmount)},
            retail {inr(row.retailAmount)}) · team {row.downlineTotal} ({row.downlineActive} active,{" "}
            {row.downlinePending} pending payment)
          </p>
          <p className="mt-2 text-sm">
            Pay to: {row.member.accountName || "—"} · {row.member.bankName || "—"} · A/c{" "}
            {row.member.accountNumber || "missing"} · IFSC {row.member.ifsc || "—"}
            {row.member.upiId ? ` · UPI ${row.member.upiId}` : ""}
          </p>
        </div>
        <Badge>WEEKLY</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Button onClick={onApprove}>Approve weekly payout</Button>
          <form className="flex flex-1 flex-col gap-2 md:flex-row" onSubmit={onReject}>
            <Textarea
              placeholder="Hold note for the member"
              value={notes[row.id] ?? ""}
              onChange={(e) => setNotes({ ...notes, [row.id]: e.target.value })}
              required
            />
            <Button type="submit" variant="destructive">
              Hold
            </Button>
          </form>
        </div>
        <Button variant="outline" size="sm" onClick={onToggle}>
          {open ? "Hide team snapshot" : "View team snapshot"}
        </Button>
        {open ? (
          team.length === 0 ? (
            <p className="text-sm text-muted-foreground">No downline at report time.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Member</th>
                    <th>Status</th>
                    <th>Joining payment</th>
                    <th>Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((m) => (
                    <tr key={m.memberCode} className="border-t">
                      <td className="py-2">
                        {m.name} ({m.memberCode}) {m.position ? `· ${m.position}` : ""}
                      </td>
                      <td>{m.status.replaceAll("_", " ")}</td>
                      <td>{m.joiningPaymentStatus ?? "Not submitted"}</td>
                      <td>{inr(m.generatedAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
