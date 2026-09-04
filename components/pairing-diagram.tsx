"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useId } from "react";
import { useAuth } from "@/components/auth-provider";
import { treeStatusColor, treeStatusLabel } from "@/lib/member-status";
import { cn } from "@/lib/utils";

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

const MAX_DEPTH = 10;

function registerHref(sponsorCode: string, placementCode: string, position: "LEFT" | "RIGHT") {
  const params = new URLSearchParams({
    sponsor: sponsorCode,
    placement: placementCode,
    position,
  });
  return `/register?${params.toString()}`;
}

function StatusDot({ status }: { status: string }) {
  const color = treeStatusColor(status);
  return (
    <span
      className={cn(
        "inline-block size-3 rounded-full ring-2 ring-background",
        color === "green" && "bg-emerald-500",
        color === "red" && "bg-red-500",
        color === "muted" && "bg-muted-foreground/50",
      )}
      title={treeStatusLabel(status)}
      aria-label={treeStatusLabel(status)}
    />
  );
}

function MemberCard({
  node,
  isRoot,
  side,
  isViewer,
}: {
  node: TreeNode;
  isRoot?: boolean;
  side?: "LEFT" | "RIGHT";
  isViewer?: boolean;
}) {
  const color = treeStatusColor(node.status);
  return (
    <div
      className={cn(
        "relative z-10 flex w-[148px] flex-col items-center rounded-xl border bg-card px-3 py-3 text-center shadow-sm transition-shadow hover:shadow-md",
        isRoot && "border-primary ring-2 ring-primary/20",
        isViewer && "ring-2 ring-primary/40",
        side === "LEFT" && "border-l-4 border-l-sky-500/70",
        side === "RIGHT" && "border-r-4 border-r-amber-500/70",
        color === "green" && "border-emerald-500/40 bg-emerald-50/40",
        color === "red" && "border-red-500/40 bg-red-50/40",
      )}
    >
      {side ? (
        <span
          className={cn(
            "absolute -top-2.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white",
            side === "LEFT" ? "bg-sky-600" : "bg-amber-600",
          )}
        >
          {side === "LEFT" ? "Left" : "Right"}
        </span>
      ) : null}
      <div className="mt-1 flex items-center gap-1.5">
        <StatusDot status={node.status} />
        <span
          className={cn(
            "text-[10px] font-semibold uppercase",
            color === "green" && "text-emerald-700",
            color === "red" && "text-red-700",
            color === "muted" && "text-muted-foreground",
          )}
        >
          {treeStatusLabel(node.status)}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-tight">{node.name}</p>
      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{node.memberCode}</p>
      {node.rank ? <p className="mt-1 text-[10px] text-muted-foreground">{node.rank}</p> : null}
      {isViewer ? <p className="mt-1 text-[10px] font-medium text-primary">You</p> : null}
    </div>
  );
}

function EmptySlot({
  placementCode,
  position,
  sponsorCode,
}: {
  placementCode: string;
  position: "LEFT" | "RIGHT";
  sponsorCode: string;
}) {
  const href = registerHref(sponsorCode, placementCode, position);
  return (
    <Link
      href={href}
      className={cn(
        "group relative z-10 flex h-[88px] w-[148px] flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/20 text-center transition-colors hover:border-primary hover:bg-primary/5",
        position === "LEFT" ? "border-sky-400/50 hover:border-sky-600" : "border-amber-400/50 hover:border-amber-600",
      )}
      title={`Register a new member on the ${position === "LEFT" ? "left" : "right"} side`}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full border-2 transition-colors group-hover:text-primary",
          position === "LEFT"
            ? "border-sky-500/60 text-sky-700 group-hover:border-sky-600 group-hover:bg-sky-50"
            : "border-amber-500/60 text-amber-700 group-hover:border-amber-600 group-hover:bg-amber-50",
        )}
      >
        <Plus className="size-5" strokeWidth={2.5} />
      </span>
      <p className="mt-1.5 text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
        Add {position === "LEFT" ? "left" : "right"}
      </p>
    </Link>
  );
}

function BranchConnectors() {
  const markerId = `tree-arrow-${useId().replace(/:/g, "")}`;

  return (
    <svg
      className="pointer-events-none mx-auto h-12 w-full min-w-[12rem] text-primary/55"
      viewBox="0 0 320 48"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <marker id={markerId} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <polygon points="0 0, 7 3.5, 0 7" fill="currentColor" />
        </marker>
      </defs>
      <path d="M 160 0 L 160 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M 56 14 L 264 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M 56 14 L 56 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
      />
      <path
        d="M 264 14 L 264 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
      />
    </svg>
  );
}

function TreeBranch({
  node,
  depth,
  sponsorCode,
  viewerId,
  side,
}: {
  node: TreeNode;
  depth: number;
  sponsorCode: string;
  viewerId?: string;
  side?: "LEFT" | "RIGHT";
}) {
  const showChildren = depth < MAX_DEPTH;

  return (
    <div className="flex flex-col items-center">
      <MemberCard
        node={node}
        isRoot={depth === 0}
        side={side}
        isViewer={viewerId === node.id}
      />
      {showChildren ? (
        <div className="flex w-full min-w-[18rem] flex-col items-center sm:min-w-[22rem]">
          <BranchConnectors />
          <div className="grid w-full grid-cols-2 gap-3 sm:gap-6 md:gap-10">
            <div className="flex flex-col items-center">
              {node.left ? (
                <TreeBranch
                  node={node.left}
                  depth={depth + 1}
                  sponsorCode={sponsorCode}
                  viewerId={viewerId}
                  side="LEFT"
                />
              ) : (
                <EmptySlot placementCode={node.memberCode} position="LEFT" sponsorCode={sponsorCode} />
              )}
            </div>
            <div className="flex flex-col items-center">
              {node.right ? (
                <TreeBranch
                  node={node.right}
                  depth={depth + 1}
                  sponsorCode={sponsorCode}
                  viewerId={viewerId}
                  side="RIGHT"
                />
              ) : (
                <EmptySlot placementCode={node.memberCode} position="RIGHT" sponsorCode={sponsorCode} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PairingDiagram({
  tree,
  volume,
  viewerId,
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
  viewerId?: string;
}) {
  const { member } = useAuth();
  const sponsorCode = member?.memberCode ?? tree.memberCode;

  const leftCarry = volume.carryLeft + volume.leftCount - volume.pairsMatched;
  const rightCarry = volume.carryRight + volume.rightCount - volume.pairsMatched;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Today's matched pairs" value={String(volume.pairsMatched)} hint="Capped at 10 / day" />
        <Stat
          label="Left leg (carry-forward)"
          value={String(leftCarry)}
          hint={`${volume.leftCount} new today · ${volume.carryLeft} carried`}
        />
        <Stat
          label="Right leg (carry-forward)"
          value={String(rightCarry)}
          hint={`${volume.rightCount} new today · ${volume.carryRight} carried`}
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Full genealogy from the top distributor. Tap <span className="font-medium text-foreground">+</span> on an open
        slot to register with sponsor and placement pre-filled.
      </p>

      <div className="overflow-x-auto rounded-xl border bg-gradient-to-b from-muted/30 to-background p-4 sm:p-8">
        <div className="mx-auto w-max min-w-full px-2">
          <TreeBranch node={tree} depth={0} sponsorCode={sponsorCode} viewerId={viewerId} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-emerald-500" /> Green — activated
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-red-500" /> Red — awaiting admin PIN
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm border-l-4 border-l-sky-500 bg-card" /> Left leg
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm border-r-4 border-r-amber-500 bg-card" /> Right leg
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="flex size-4 items-center justify-center rounded border border-dashed">
            <Plus className="size-2.5" />
          </span>
          Open slot → Register
        </span>
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
