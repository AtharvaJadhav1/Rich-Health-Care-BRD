"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Tree</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your binary genealogy with left/right legs. Tap + on an open slot to register a new member there.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pairing diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <PairingDiagram tree={tree.tree} volume={tree.volume} />
        </CardContent>
      </Card>
      <PinControls joiningAmount={joiningAmount} onChanged={load} />
    </div>
  );
}
