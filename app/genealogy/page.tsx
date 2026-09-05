"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { PageHero, PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GenealogyPage() {
  return (
    <RequireAuth>
      <PageShell width="6xl" className="space-y-6">
        <PageHero
          title="Genealogy"
          description="View your binary tree and everyone placed under you in the network."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tree</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pairing diagram with left and right legs. Tap members to view their downline only.
              </p>
              <Link href="/tree" className={buttonVariants()}>
                Open tree
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>My Total Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Full list of distributors under you with leg, joined date, and income generated.
              </p>
              <Link href="/genealogy/team" className={buttonVariants({ variant: "outline" })}>
                View my team
              </Link>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </RequireAuth>
  );
}
