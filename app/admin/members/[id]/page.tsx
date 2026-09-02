"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/require-auth";
import { AdminNav } from "@/components/admin-nav";
import { api } from "@/lib/api";
import { formatDate, inr } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Report = {
  member: {
    name: string;
    phone: string;
    memberCode: string;
    status: string;
    rank: string | null;
    position: string | null;
    activatedAt: string | null;
  };
  sponsor: { name: string; memberCode: string } | null;
  parent: { name: string; memberCode: string } | null;
  wallet: {
    balance: number;
    ledger: {
      id: string;
      type: string;
      amount: number;
      note: string | null;
      createdAt: string;
    }[];
  } | null;
  payments: { id: string; purpose: string; amount: number; status: string; referenceNo: string; createdAt: string }[];
  orders: { id: string; quantity: number; status: string; product: { name: string; dp: number } }[];
  weeklyPayouts: {
    id: string;
    weekStart: string;
    weekEnd: string;
    generatedAmount: number;
    downlineTotal: number;
    status: string;
  }[];
  team: {
    downlineCount: number;
    downlineActive: number;
    downlinePending: number;
    generatedThisWeek: number;
    lifetimeGenerated: number;
    downline: {
      id: string;
      name: string;
      memberCode: string;
      status: string;
      joiningPaymentStatus: string | null;
      generatedAmount: number;
      position: string | null;
    }[];
  };
};

export default function MemberReportPage() {
  return (
    <RequireAuth role="ADMIN">
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Report>(`/admin/members/${params.id}/report`)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load report"));
  }, [params.id]);

  if (error) return <p className="px-4 py-16 text-center text-destructive">{error}</p>;
  if (!report) return <p className="px-4 py-16 text-center text-muted-foreground">Loading report…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <AdminNav />
      <div>
        <h1 className="font-heading text-3xl font-semibold">{report.member.name}</h1>
        <p className="text-sm text-muted-foreground">
          {report.member.memberCode} · {report.member.phone} · rank {report.member.rank ?? "Distributor"}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{report.member.status.replaceAll("_", " ")}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{inr(report.wallet?.balance ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{report.team.downlineCount}</p>
            <p className="text-sm text-muted-foreground">
              {report.team.downlineActive} active · {report.team.downlinePending} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{inr(report.team.lifetimeGenerated)}</p>
            <p className="text-sm text-muted-foreground">This week {inr(report.team.generatedThisWeek)}</p>
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">
        Sponsor {report.sponsor ? `${report.sponsor.name} (${report.sponsor.memberCode})` : "—"} · Placement parent{" "}
        {report.parent ? `${report.parent.name} (${report.parent.memberCode})` : "root"} · Leg{" "}
        {report.member.position ?? "—"}
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Downline</CardTitle>
        </CardHeader>
        <CardContent>
          {report.team.downline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members under this ID.</p>
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
                  {report.team.downline.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="py-2">
                        {row.name} ({row.memberCode}) {row.position ? `· ${row.position}` : ""}
                      </td>
                      <td>{row.status.replaceAll("_", " ")}</td>
                      <td>{row.joiningPaymentStatus ?? "Not submitted"}</td>
                      <td>{inr(row.generatedAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Weekly payouts</CardTitle>
        </CardHeader>
        <CardContent>
          {report.weeklyPayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No weekly reports generated yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {report.weeklyPayouts.map((row) => (
                <li key={row.id} className="flex justify-between border-b py-2">
                  <span>
                    {row.weekStart} → {row.weekEnd} · {inr(row.generatedAmount)} · team {row.downlineTotal}
                  </span>
                  <Badge variant={row.status === "APPROVED" ? "default" : "secondary"}>{row.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Joining / order payments</CardTitle>
        </CardHeader>
        <CardContent>
          {report.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No UTR submissions.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {report.payments.map((p) => (
                <li key={p.id} className="flex justify-between border-b py-2">
                  <span>
                    {p.purpose} · {inr(p.amount)} · UTR {p.referenceNo} · {formatDate(p.createdAt)}
                  </span>
                  <span>{p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {(report.wallet?.ledger.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No ledger entries.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {report.wallet?.ledger.map((row) => (
                <li key={row.id} className="flex justify-between border-b py-2">
                  <span>
                    {formatDate(row.createdAt)} · {row.type.replaceAll("_", " ")} · {row.note}
                  </span>
                  <span>{inr(row.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
