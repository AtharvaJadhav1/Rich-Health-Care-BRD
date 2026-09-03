"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHero, PageShell } from "@/components/page-shell";
import { RequireAuth } from "@/components/require-auth";
import { PairingDiagram, TreeNode } from "@/components/pairing-diagram";
import { PinControls } from "@/components/pin-controls";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TreePage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [tree, setTree] = useState<{
    tree: TreeNode;
    volume: {
      leftCount: number;
      rightCount: number;
      carryLeft: number;
      carryRight: number;
      pairsMatched: number;
      payout: number;
    };
  } | null>(null);
  const [joiningAmount, setJoiningAmount] = useState(999);

  async function load() {
    const [t, plan] = await Promise.all([
      api<{ tree: TreeNode; volume: never }>("/member/tree"),
      api<{ joiningAmount: number }>("/plan"),
    ]);
    setTree(t as never);
    setJoiningAmount(plan.joiningAmount);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, []);

  if (!tree) {
    return <p className="px-4 py-16 text-center text-muted-foreground">Loading tree…</p>;
  }

  return (
    <PageShell width="6xl" className="space-y-8">
      <PageHero
        title="Tree"
        description="Your binary genealogy with left/right legs. Tap + on an open slot to register a new member there."
      />
      <Card>
        <CardHeader>
          <CardTitle>Pairing diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <PairingDiagram tree={tree.tree} volume={tree.volume} />
        </CardContent>
      </Card>
      <PinControls joiningAmount={joiningAmount} onChanged={load} />
    </PageShell>
  );
}
