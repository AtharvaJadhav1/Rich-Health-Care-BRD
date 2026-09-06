"use client";

import Link from "next/link";
import { Minus, Plus, RotateCcw, User } from "lucide-react";
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
  photoUrl?: string | null;
  left: TreeNode | null;
  right: TreeNode | null;
};

const MAX_DEPTH = 10;
const TREE_VIEWPORT_HEIGHT = 560;

function registerHref(sponsorCode: string, placementCode: string, position: "LEFT" | "RIGHT") {
  const params = new URLSearchParams({
    sponsor: sponsorCode,
    placement: placementCode,
    position,
  });
  return `/register?${params.toString()}`;
}

function memberInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function StatusRing({ status }: { status: string }) {
  const color = treeStatusColor(status);
  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card",
        color === "green" && "bg-emerald-500",
        color === "red" && "bg-red-500",
        color === "muted" && "bg-muted-foreground/50",
      )}
      title={treeStatusLabel(status)}
      aria-label={treeStatusLabel(status)}
    />
  );
}

function MemberAvatar({ node, isRoot }: { node: TreeNode; isRoot?: boolean }) {
  const color = treeStatusColor(node.status);
  const initials = memberInitials(node.name);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-card",
        isRoot ? "size-14 ring-primary/50" : "size-11",
        color === "green" && "ring-emerald-500/60",
        color === "red" && "ring-red-500/60",
        color === "muted" && "ring-muted-foreground/30",
      )}
    >
      {node.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={node.photoUrl} alt="" className="size-full object-cover" />
      ) : (
        <div
          className={cn(
            "flex size-full items-center justify-center text-xs font-semibold",
            color === "green" && "bg-emerald-100 text-emerald-800",
            color === "red" && "bg-red-100 text-red-800",
            color === "muted" && "bg-muted text-muted-foreground",
          )}
        >
          {initials || <User className="size-4" />}
        </div>
      )}
      <StatusRing status={node.status} />
    </div>
  );
}

function MemberCard({
  node,
  isRoot,
  side,
  isViewer,
  depth,
  onFocus,
}: {
  node: TreeNode;
  isRoot?: boolean;
  side?: "LEFT" | "RIGHT";
  isViewer?: boolean;
  depth: number;
  onFocus?: () => void;
}) {
  const color = treeStatusColor(node.status);
  const className = cn(
    "group relative z-10 flex w-[136px] shrink-0 flex-col items-center rounded-2xl border bg-card/95 px-3 py-3 text-center shadow-md backdrop-blur-sm transition-all duration-200",
    isRoot && "w-[148px] border-primary/40 bg-gradient-to-b from-primary/10 to-card shadow-lg ring-2 ring-primary/25",
    isViewer && "ring-2 ring-primary/50",
    side === "LEFT" && "border-l-[3px] border-l-sky-500",
    side === "RIGHT" && "border-r-[3px] border-r-amber-500",
    color === "green" && !isRoot && "border-emerald-500/35 bg-gradient-to-b from-emerald-50/80 to-card",
    color === "red" && !isRoot && "border-red-500/35 bg-gradient-to-b from-red-50/70 to-card",
    onFocus && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:ring-2 hover:ring-primary/30",
    depth >= 3 && "opacity-95",
    depth >= 4 && "opacity-90",
  );

  const content = (
    <>
      {side ? (
        <span
          className={cn(
            "absolute -top-2.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm",
            side === "LEFT" ? "bg-gradient-to-r from-sky-600 to-sky-500" : "bg-gradient-to-r from-amber-600 to-amber-500",
          )}
        >
          {side === "LEFT" ? "Left leg" : "Right leg"}
        </span>
      ) : isRoot ? (
        <span className="absolute -top-2.5 rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
          Root
        </span>
      ) : null}

      <MemberAvatar node={node} isRoot={isRoot} />

      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight text-foreground">{node.name}</p>
      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{node.memberCode}</p>

      <span
        className={cn(
          "mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
          color === "green" && "bg-emerald-100 text-emerald-800",
          color === "red" && "bg-red-100 text-red-800",
          color === "muted" && "bg-muted text-muted-foreground",
        )}
      >
        {treeStatusLabel(node.status)}
      </span>

      {node.rank ? <p className="mt-1 text-[10px] font-medium text-muted-foreground">{node.rank}</p> : null}
      {isViewer ? (
        <p className="mt-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">You</p>
      ) : null}
      {onFocus ? (
        <p className="mt-1 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          View downline →
        </p>
      ) : null}
    </>
  );

  if (onFocus) {
    return (
      <button
        type="button"
        className={className}
        onClick={onFocus}
        title={`View ${node.memberCode} and downline only`}
      >
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
  const isLeft = position === "LEFT";

  return (
    <Link
      href={href}
      className={cn(
        "group relative z-10 flex h-[88px] w-[136px] shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-gradient-to-b text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        isLeft
          ? "border-sky-400/60 from-sky-50/50 to-card hover:border-sky-500 hover:from-sky-50"
          : "border-amber-400/60 from-amber-50/50 to-card hover:border-amber-500 hover:from-amber-50",
      )}
      title={`Register a new member on the ${isLeft ? "left" : "right"} side`}
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full border-2 transition-all group-hover:scale-110",
          isLeft
            ? "border-sky-500/70 bg-sky-50 text-sky-700 group-hover:border-sky-600 group-hover:bg-sky-100"
            : "border-amber-500/70 bg-amber-50 text-amber-700 group-hover:border-amber-600 group-hover:bg-amber-100",
        )}
      >
        <Plus className="size-5" strokeWidth={2.5} />
      </span>
      <p className="mt-2 text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
        Add {isLeft ? "left" : "right"}
      </p>
    </Link>
  );
}

function BranchConnectors({ depth }: { depth: number }) {
  const leftId = useId().replace(/:/g, "");
  const rightId = useId().replace(/:/g, "");
  const strokeW = depth === 0 ? 2.5 : depth === 1 ? 2 : 1.5;

  return (
    <svg
      className="pointer-events-none mx-auto h-12 w-full min-w-[11rem] sm:min-w-[14rem]"
      viewBox="0 0 360 56"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`lg-${leftId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgb(14 165 233 / 0.7)" />
          <stop offset="100%" stopColor="rgb(14 165 233 / 0.35)" />
        </linearGradient>
        <linearGradient id={`rg-${rightId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgb(245 158 11 / 0.7)" />
          <stop offset="100%" stopColor="rgb(245 158 11 / 0.35)" />
        </linearGradient>
      </defs>
      {/* trunk */}
      <path
        d="M 180 0 L 180 18"
        fill="none"
        stroke="rgb(34 120 80 / 0.45)"
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
      {/* horizontal branch */}
      <path
        d="M 72 18 Q 180 18 288 18"
        fill="none"
        stroke="rgb(34 120 80 / 0.35)"
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
      {/* left curved branch */}
      <path
        d="M 72 18 C 72 28, 72 38, 72 52"
        fill="none"
        stroke={`url(#lg-${leftId})`}
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
      {/* right curved branch */}
      <path
        d="M 288 18 C 288 28, 288 38, 288 52"
        fill="none"
        stroke={`url(#rg-${rightId})`}
        strokeWidth={strokeW}
        strokeLinecap="round"
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
        depth={depth}
        onFocus={canFocus ? () => onFocusMember!(node.id) : undefined}
      />
      {showChildren ? (
        <div className="flex w-full min-w-[18rem] flex-col items-center sm:min-w-[22rem]">
          <BranchConnectors depth={depth} />
          <div
            className={cn(
              "grid w-full grid-cols-2",
              depth === 0 ? "gap-3 sm:gap-5" : depth === 1 ? "gap-2 sm:gap-3" : "gap-1.5",
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
  const [manualZoom, setManualZoom] = useState(1);

  useLayoutEffect(() => {
    function fit() {
      const box = boxRef.current;
      const content = contentRef.current;
      if (!box || !content) return;
      const padding = 32;
      const availW = Math.max(box.clientWidth - padding, 1);
      const availH = Math.max(box.clientHeight - padding, 1);
      const needW = content.scrollWidth;
      const needH = content.scrollHeight;
      if (needW <= 0 || needH <= 0) return;
      const auto = Math.min(1, availW / needW, availH / needH);
      setScale(Math.max(0.4, auto) * manualZoom);
    }

    fit();
    const observer = new ResizeObserver(fit);
    if (boxRef.current) observer.observe(boxRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [children, manualZoom]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setManualZoom((z) => Math.max(0.5, z - 0.1))}
          aria-label="Zoom out"
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setManualZoom((z) => Math.min(1.5, z + 0.1))}
          aria-label="Zoom in"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setManualZoom(1)}
          aria-label="Reset zoom"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>
      <div
        ref={boxRef}
        className="relative w-full overflow-auto rounded-2xl border border-primary/15 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50/80 via-background to-amber-50/40 p-4 shadow-inner sm:p-5"
        style={{ height: TREE_VIEWPORT_HEIGHT }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23166534' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
          aria-hidden
        />
        <div className="flex min-h-full min-w-full items-start justify-center">
          <div
            ref={contentRef}
            className="px-2 transition-transform duration-200"
            style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
          >
            {children}
          </div>
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
    <div className={treeOnly ? "space-y-4" : "space-y-6"}>
      {showReset ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            onClick={onResetFocus}
          >
            ← Back to my tree
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
            accent="sky"
          />
          <Stat
            label="Right leg (carry-forward)"
            value={String(rightCarry)}
            hint={`${volume.rightCount} new today · ${volume.carryRight} carried`}
            accent="amber"
          />
        </div>
      ) : null}

      {!treeOnly ? (
        <p className="text-center text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{tree.memberCode}</span> and downline only. Tap a member
          to view their leg, or tap <span className="font-medium text-foreground">+</span> on an open slot to register.
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
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200" /> Green — activated
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-red-500 ring-2 ring-red-200" /> Red — awaiting PIN / approval
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-sm border-l-[3px] border-l-sky-500 bg-card" /> Left leg
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-sm border-r-[3px] border-r-amber-500 bg-card" /> Right leg
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="flex size-4 items-center justify-center rounded border border-dashed border-primary/40">
              <Plus className="size-2.5" />
            </span>
            Open slot → Register
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: "sky" | "amber";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm",
        accent === "sky" && "border-sky-200/60",
        accent === "amber" && "border-amber-200/60",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
