"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { PairingDiagram, TreeNode } from "@/components/pairing-diagram";
import { api } from "@/lib/api";

type TreePayload = {
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
};

export default function TreePage() {
  return (
    <RequireAuth>
      <Suspense fallback={<p className="px-4 py-16 text-center text-muted-foreground">Loading tree…</p>}>
        <Inner />
      </Suspense>
    </RequireAuth>
  );
}

function Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("focus")?.trim() || undefined;
  const [tree, setTree] = useState<TreePayload | null>(null);

  const loadTree = useCallback(async (focusId?: string) => {
    const path = focusId ? `/member/tree?focus=${encodeURIComponent(focusId)}` : "/member/tree";
    const data = await api<TreePayload>(path);
    setTree(data);
  }, []);

  useEffect(() => {
    loadTree(focusParam).catch((err) => toast.error(err.message));
  }, [focusParam, loadTree]);

  function focusMember(id: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("focus", id);
    router.push(`/tree?${next.toString()}`, { scroll: false });
  }

  function resetFocus() {
    router.push("/tree", { scroll: false });
  }

  if (!tree) {
    return <p className="px-4 py-16 text-center text-muted-foreground">Loading tree…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="text-center sm:text-left">
        <p className="section-eyebrow">Genealogy</p>
        <h1 className="font-heading mt-1 text-2xl font-semibold sm:text-3xl">Binary tree</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your network — tap any member to explore their downline, or use + on empty slots to register. Use your browser
          back button to return to the previous tree view.
        </p>
      </div>
      <PairingDiagram
        variant="tree-only"
        tree={tree.tree}
        volume={tree.volume}
        viewerId={tree.viewerId}
        focusId={tree.focusId}
        onFocusMember={focusMember}
        onResetFocus={resetFocus}
      />
    </div>
  );
}
