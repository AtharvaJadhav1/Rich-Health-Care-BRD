"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { TeamTable, type TeamSummary } from "@/components/team-table";
import { PageHero, PageShell } from "@/components/page-shell";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FullTeam = TeamSummary & {
  downlineCount: number;
  downlineActive: number;
  downlinePending: number;
};

export default function TeamPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [team, setTeam] = useState<FullTeam | null>(null);

  useEffect(() => {
    api<FullTeam>("/member/team")
      .then(setTeam)
      .catch((err) => toast.error(err.message));
  }, []);

  if (!team) {
    return <p className="px-4 py-16 text-center text-muted-foreground">Loading team…</p>;
  }

  return (
    <PageShell width="6xl" className="space-y-6">
      <PageHero
        title="My Total Team"
        description="Everyone placed under you in the binary tree, with joining payment status and how much they have generated."
      />
      <Card>
        <CardHeader>
          <CardTitle>
            {team.downlineCount} members · {team.downlineActive} active · {team.downlinePending} pending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeamTable team={team} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
