import { Badge } from "@/components/ui/badge";

export type TreeNode = {
  id: string;
  name: string;
  memberCode: string;
  position: string | null;
  status: string;
  rank: string | null;
  left: TreeNode | null;
  right: TreeNode | null;
};

function NodeCard({ node, label }: { node: TreeNode | null; label: string }) {
  if (!node) {
    return (
      <div className="flex min-w-[140px] flex-col items-center rounded-xl border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
        Open {label} slot
      </div>
    );
  }
  return (
    <div className="flex min-w-[140px] flex-col items-center rounded-xl border bg-card px-3 py-3 text-center shadow-sm">
      <p className="text-sm font-medium">{node.name}</p>
      <p className="font-mono text-xs text-muted-foreground">{node.memberCode}</p>
      <Badge variant={node.status === "ACTIVE" ? "default" : "secondary"} className="mt-2">
        {node.status === "ACTIVE" ? "Active" : node.status.replaceAll("_", " ")}
      </Badge>
    </div>
  );
}

function Branch({ node }: { node: TreeNode }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <NodeCard node={node} label="root" />
      <div className="h-6 w-px bg-border" />
      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Left</p>
          <NodeCard node={node.left} label="left" />
          {node.left ? (
            <div className="flex gap-3">
              <NodeCard node={node.left.left} label="LL" />
              <NodeCard node={node.left.right} label="LR" />
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Right</p>
          <NodeCard node={node.right} label="right" />
          {node.right ? (
            <div className="flex gap-3">
              <NodeCard node={node.right.left} label="RL" />
              <NodeCard node={node.right.right} label="RR" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PairingDiagram({
  tree,
  volume,
}: {
  tree: TreeNode;
  volume: {
    leftCount: number;
    rightCount: number;
    carryLeft: number;
    carryRight: number;
    pairsMatched: number;
    payout: number;
  };
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Today's matched pairs" value={String(volume.pairsMatched)} hint="Capped at 10 / day" />
        <Stat
          label="Left carry-forward"
          value={String(volume.carryLeft + volume.leftCount - volume.pairsMatched)}
          hint={`${volume.leftCount} new + ${volume.carryLeft} carried`}
        />
        <Stat
          label="Right carry-forward"
          value={String(volume.carryRight + volume.rightCount - volume.pairsMatched)}
          hint={`${volume.rightCount} new + ${volume.carryRight} carried`}
        />
      </div>
      <div className="overflow-x-auto pb-2">
        <Branch node={tree} />
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border bg-muted/40 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
