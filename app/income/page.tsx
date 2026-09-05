"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { PageHero, PageShell } from "@/components/page-shell";
import { api } from "@/lib/api";
import { inr } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TeamSummary = {
  weekStart: string;
  weekEnd: string;
  generatedThisWeek: number;
  matchingThisWeek: number;
  retailThisWeek: number;
  lifetimeGenerated: number;
  walletBalance: number;
};

type Wallet = { balance: number };

export default function IncomePage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    Promise.all([api<TeamSummary>("/member/team"), api<Wallet>("/member/wallet")])
      .then(([teamData, walletData]) => {
        setTeam(teamData);
        setWallet(walletData);
      })
      .catch((err) => toast.error(err.message));
  }, []);

  if (!team || !wallet) {
    return <p className="px-4 py-16 text-center text-muted-foreground">Loading income…</p>;
  }

  return (
    <PageShell width="6xl" className="space-y-6">
      <PageHero
        title="Balance Income"
        description="Your wallet balance and generated income for this week and lifetime."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Wallet balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{inr(wallet.balance)}</p>
            <p className="text-sm text-muted-foreground">Available until weekly payout is approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>This week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{inr(team.generatedThisWeek)}</p>
            <p className="text-sm text-muted-foreground">
              {team.weekStart} to {team.weekEnd}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lifetime generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{inr(team.lifetimeGenerated)}</p>
            <p className="text-sm text-muted-foreground">Matching + retail income credited</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Matching this week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{inr(team.matchingThisWeek)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Retail this week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{inr(team.retailThisWeek)}</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
