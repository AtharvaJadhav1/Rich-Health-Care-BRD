"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { AdminNav } from "@/components/admin-nav";
import { api, downloadCsv } from "@/lib/api";
import { formatDate, inr } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Run = {
  id: string;
  date: string;
  ranAt: string;
  membersProcessed: number;
  pairsTotal: number;
  payoutTotal: number;
};

export default function MatchingPage() {
  return (
    <RequireAuth role="ADMIN">
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setRuns(await api<Run[]>("/admin/matching/runs"));
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, []);

  async function run() {
    setBusy(true);
    try {
      const result = await api<{ run: Run }>("/admin/run-matching", { method: "POST", body: {} });
      toast.success(
        `Matching complete: ${result.run.pairsTotal} pairs, ${inr(result.run.payoutTotal)} net`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Matching failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <AdminNav />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Daily matching</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Runs once per date. Caps at 10 pairs per member, applies GST and admin cuts, writes ledger
            entries, and carries unmatched volume forward. Only ACTIVE members count.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadCsv("/admin/payouts/export", "payouts.csv")}>
            Export payouts
          </Button>
          <Button onClick={run} disabled={busy}>
            {busy ? "Running…" : "Run today's matching"}
          </Button>
        </div>
      </div>
      {runs?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-muted-foreground">
            No matching runs yet. Run matching after real members are activated.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {runs?.map((runRow) => (
            <Card key={runRow.id}>
              <CardHeader>
                <CardTitle>{runRow.date}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{runRow.pairsTotal} pairs · {inr(runRow.payoutTotal)} net</p>
                <p>{runRow.membersProcessed} active members · {formatDate(runRow.ranAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
