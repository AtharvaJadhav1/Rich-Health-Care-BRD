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
    viewerId?: string;
    focusId?: string;
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

  async function loadTree(focusId?: string) {
    const path = focusId ? `/member/tree?focus=${encodeURIComponent(focusId)}` : "/member/tree";
    const t = await api<{
      tree: TreeNode;
      viewerId?: string;
      focusId?: string;
      volume: never;
    }>(path);
    setTree(t as never);
  }

  async function load() {
    const plan = await api<{ joiningAmount: number }>("/plan");
    setJoiningAmount(plan.joiningAmount);
    await loadTree();
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
        description="Your downline from your ID. Tap a member to view only their leg below them."
      />
      <Card>
        <CardHeader>
          <CardTitle>Pairing diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <PairingDiagram
            tree={tree.tree}
            volume={tree.volume}
            viewerId={tree.viewerId}
            focusId={tree.focusId}
            onFocusMember={(id) => loadTree(id).catch((err) => toast.error(err.message))}
            onResetFocus={() => loadTree().catch((err) => toast.error(err.message))}
          />
        </CardContent>
      </Card>
      <PinControls joiningAmount={joiningAmount} onChanged={load} />
    </PageShell>
  );
}
