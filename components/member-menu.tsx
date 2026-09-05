"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isStaffRole } from "@/lib/member-status";

type MenuLink = { href: string; label: string };
type MenuGroup = { label: string; children: MenuLink[] };
type MenuItem = MenuLink | MenuGroup;

const pinLinks: MenuLink[] = [
  { href: "/pins/transfer", label: "Pin Transfer" },
  { href: "/pins/used", label: "Pin Used" },
  { href: "/pins/unused", label: "Pin Unused" },
];

const memberMenu: MenuItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/kyc", label: "KYC" },
  { href: "/profile", label: "My Profile" },
  {
    label: "Genealogy",
    children: [
      { href: "/tree", label: "Tree" },
      { href: "/genealogy/team", label: "My Total Team" },
    ],
  },
  { href: "/ewallet", label: "E Wallet" },
  {
    label: "Income",
    children: [
      { href: "/income", label: "Balance Income" },
      { href: "/income/slip", label: "Income Slip" },
    ],
  },
  { label: "PIN", children: pinLinks },
  { href: "/support", label: "Support" },
];

function kycBadge(status?: string) {
  if (status === "VERIFIED") return "Verified";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) || pathname.startsWith(href);
}

function MenuLinkRow({
  link,
  pathname,
  onNavigate,
  badge,
}: {
  link: MenuLink;
  pathname: string;
  onNavigate: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={cn(
        "block rounded-lg px-3 py-2.5 text-base transition-colors",
        isActive(pathname, link.href)
          ? "bg-primary/10 font-medium text-primary"
          : "text-foreground hover:bg-muted",
      )}
    >
      {link.label}
      {badge}
    </Link>
  );
}

function MenuGroupRow({
  group,
  pathname,
  onNavigate,
}: {
  group: MenuGroup;
  pathname: string;
  onNavigate: () => void;
}) {
  const openByDefault = group.children.some((child) => isActive(pathname, child.href));
  const [open, setOpen] = useState(openByDefault);

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-base hover:bg-muted"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{group.label}</span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="ml-3 border-l pl-2">
          {group.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onNavigate}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(pathname, child.href)
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-foreground hover:bg-muted",
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MemberMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { member } = useAuth();
  const pathname = usePathname();

  if (!member || member.role !== "MEMBER") return null;

  function navigate() {
    onNavigate?.();
  }

  return (
    <div className="space-y-1">
      <div className="mb-4 rounded-xl border bg-muted/30 px-3 py-3">
        <p className="font-heading text-base font-semibold">{member.name}</p>
        <p className="font-mono text-sm text-muted-foreground">{member.memberCode}</p>
      </div>
      {memberMenu.map((item) =>
        "children" in item ? (
          <MenuGroupRow key={item.label} group={item} pathname={pathname} onNavigate={navigate} />
        ) : (
          <MenuLinkRow
            key={item.href}
            link={item}
            pathname={pathname}
            onNavigate={navigate}
            badge={
              item.href === "/kyc" ? (
                <Badge
                  variant={member.kycStatus === "VERIFIED" ? "default" : "secondary"}
                  className="ml-2 h-5 px-1.5 text-[10px]"
                >
                  {kycBadge(member.kycStatus)}
                </Badge>
              ) : null
            }
          />
        ),
      )}
    </div>
  );
}
