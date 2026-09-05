"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState } from "react";
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
const TREE_VIEWPORT_HEIGHT = 400;

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
  onFocus,
}: {
  node: TreeNode;
  isRoot?: boolean;
  side?: "LEFT" | "RIGHT";
  isViewer?: boolean;
  onFocus?: () => void;
}) {
  const color = treeStatusColor(node.status);
  const className = cn(
    "relative z-10 flex w-[118px] shrink-0 flex-col items-center rounded-xl border bg-card px-2.5 py-2.5 text-center shadow-sm transition-shadow hover:shadow-md",
    isRoot && "border-primary ring-2 ring-primary/20",
    isViewer && "ring-2 ring-primary/40",
    side === "LEFT" && "border-l-4 border-l-sky-500/70",
    side === "RIGHT" && "border-r-4 border-r-amber-500/70",
    color === "green" && "border-emerald-500/40 bg-emerald-50/40",
    color === "red" && "border-red-500/40 bg-red-50/40",
    onFocus && "cursor-pointer hover:ring-2 hover:ring-primary/30",
  );

  const content = (
    <>
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
      {onFocus ? (
        <p className="mt-1 text-[10px] font-medium text-muted-foreground">View downline</p>
      ) : null}
    </>
  );

  if (onFocus) {
    return (
      <button type="button" className={className} onClick={onFocus} title={`View ${node.memberCode} and downline only`}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
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
        "group relative z-10 flex h-[72px] w-[118px] shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/20 text-center transition-colors hover:border-primary hover:bg-primary/5",
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
      className="pointer-events-none mx-auto h-8 w-full min-w-[9rem] text-primary/55"
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
  onFocusMember,
}: {
  node: TreeNode;
  depth: number;
  sponsorCode: string;
  viewerId?: string;
  side?: "LEFT" | "RIGHT";
  onFocusMember?: (memberId: string) => void;
}) {
  const showChildren = depth < MAX_DEPTH;
  const canFocus = Boolean(onFocusMember && depth > 0);

  return (
    <div className="flex flex-col items-center">
      <MemberCard
        node={node}
        isRoot={depth === 0}
        side={side}
        isViewer={viewerId === node.id}
        onFocus={canFocus ? () => onFocusMember!(node.id) : undefined}
      />
      {showChildren ? (
        <div className="flex w-full min-w-[16rem] flex-col items-center sm:min-w-[18rem]">
          <BranchConnectors />
          <div
            className={cn(
              "grid w-full grid-cols-2",
              depth === 0 ? "gap-2 sm:gap-3" : depth === 1 ? "gap-1.5 sm:gap-2" : "gap-1",
            )}
          >
            <div className="flex flex-col items-center">
              {node.left ? (
                <TreeBranch
                  node={node.left}
                  depth={depth + 1}
                  sponsorCode={sponsorCode}
                  viewerId={viewerId}
                  side="LEFT"
                  onFocusMember={onFocusMember}
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
                  onFocusMember={onFocusMember}
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

function TreeScaleViewport({ children }: { children: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    function fit() {
      const box = boxRef.current;
      const content = contentRef.current;
      if (!box || !content) return;
      const padding = 24;
      const availW = Math.max(box.clientWidth - padding, 1);
      const availH = Math.max(box.clientHeight - padding, 1);
      const needW = content.scrollWidth;
      const needH = content.scrollHeight;
      if (needW <= 0 || needH <= 0) return;
      const next = Math.min(1, availW / needW, availH / needH);
      setScale(Math.max(0.45, next));
    }

    fit();
    const observer = new ResizeObserver(fit);
    if (boxRef.current) observer.observe(boxRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      ref={boxRef}
      className="w-full overflow-auto rounded-xl border bg-gradient-to-b from-muted/30 to-background p-3 sm:p-4"
      style={{ height: TREE_VIEWPORT_HEIGHT }}
    >
      <div className="flex min-h-full min-w-full items-start justify-center">
        <div
          ref={contentRef}
          className="px-2"
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function PairingDiagram({
  tree,
  volume,
  viewerId,
  focusId,
  onFocusMember,
  onResetFocus,
  variant = "full",
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
  focusId?: string;
  onFocusMember?: (memberId: string) => void;
  onResetFocus?: () => void;
  variant?: "full" | "tree-only";
}) {
  const { member } = useAuth();
  const sponsorCode = member?.memberCode ?? tree.memberCode;
  const showReset = Boolean(onResetFocus && focusId && viewerId && focusId !== viewerId);

  const leftCarry = volume.carryLeft + volume.leftCount - volume.pairsMatched;
  const rightCarry = volume.carryRight + volume.rightCount - volume.pairsMatched;
  const treeOnly = variant === "tree-only";

  return (
    <div className={treeOnly ? "space-y-3" : "space-y-6"}>
      {showReset ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={onResetFocus}
          >
            Back to my tree
          </button>
        </div>
      ) : null}
      {!treeOnly ? (
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
      ) : null}

      {!treeOnly ? (
        <p className="text-center text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{tree.memberCode}</span> and downline only. Tap a member
          below to view their leg, or tap <span className="font-medium text-foreground">+</span> on an open slot to
          register.
        </p>
      ) : null}

      <TreeScaleViewport>
        <TreeBranch
          node={tree}
          depth={0}
          sponsorCode={sponsorCode}
          viewerId={viewerId}
          onFocusMember={onFocusMember}
        />
      </TreeScaleViewport>

      {!treeOnly ? (
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-emerald-500" /> Green — activated
          </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-red-500" /> Red — awaiting PIN / admin approval
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
      ) : null}
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
