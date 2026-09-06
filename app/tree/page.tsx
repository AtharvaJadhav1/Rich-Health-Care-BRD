"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { PairingDiagram, TreeNode } from "@/components/pairing-diagram";
import { api } from "@/lib/api";

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

  useEffect(() => {
    loadTree().catch((err) => toast.error(err.message));
  }, []);

  if (!tree) {
    return <p className="px-4 py-16 text-center text-muted-foreground">Loading tree…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="text-center sm:text-left">
        <p className="section-eyebrow">Genealogy</p>
        <h1 className="font-heading mt-1 text-2xl font-semibold sm:text-3xl">Binary tree</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your network — tap any member to explore their downline, or use + on empty slots to register.
        </p>
      </div>
      <PairingDiagram
        variant="tree-only"
        tree={tree.tree}
        volume={tree.volume}
        viewerId={tree.viewerId}
        focusId={tree.focusId}
        onFocusMember={(id) => loadTree(id).catch((err) => toast.error(err.message))}
        onResetFocus={() => loadTree().catch((err) => toast.error(err.message))}
      />
    </div>
  );
}
