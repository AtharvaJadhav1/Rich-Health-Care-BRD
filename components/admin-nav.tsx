"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Payments" },
  { href: "/admin/kyc", label: "KYC" },
  { href: "/admin/pins", label: "PINs" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/matching", label: "Matching" },
  { href: "/admin/config", label: "Plan config" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto pb-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm whitespace-nowrap",
            pathname === link.href ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
