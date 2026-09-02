"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Leaf, Menu } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/products", label: "Products" },
  { href: "/contact", label: "Contact" },
];

const pinLinks = [
  { href: "/pins/generate", label: "Pin Generate" },
  { href: "/pins/transfer", label: "Pin Transfer" },
  { href: "/pins/used", label: "Pin Used" },
  { href: "/pins/unused", label: "Pin Unused" },
];

function kycBadge(status?: string) {
  if (status === "VERIFIED") return "Verified";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

export function SiteHeader() {
  const { member, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isApp =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/kyc") ||
    pathname.startsWith("/pins") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/tree");

  const memberLinks = member
    ? [
        ...publicLinks,
        { href: "/dashboard", label: "Dashboard" },
        { href: "/kyc", label: "KYC" },
        { href: "/profile", label: "Profile" },
        { href: "/tree", label: "Tree" },
        ...(member.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : publicLinks;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Leaf className="size-4" />
          </span>
          Rich Health Care
        </Link>
        <nav className="hidden items-center gap-5 text-sm md:flex">
          {memberLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href || (link.href === "/kyc" && pathname.startsWith("/kyc"))
                  ? "inline-flex items-center gap-1.5 font-medium text-primary"
                  : "inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              }
            >
              {link.label}
              {link.href === "/kyc" && member ? (
                <Badge variant={member.kycStatus === "VERIFIED" ? "default" : "secondary"} className="h-5 px-1.5 text-[10px]">
                  {kycBadge(member.kycStatus)}
                </Badge>
              ) : null}
            </Link>
          ))}
          {member && member.role !== "ADMIN" ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={
                  pathname.startsWith("/pins")
                    ? "inline-flex items-center gap-1 font-medium text-primary"
                    : "inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                }
              >
                PIN <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {pinLinks.map((link) => (
                  <DropdownMenuItem key={link.href} onClick={() => router.push(link.href)}>
                    {link.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {member ? (
            <>
              <span className="text-sm text-muted-foreground">{member.memberCode}</span>
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
                Sign in
              </Link>
              <Link href="/register" className={buttonVariants()}>
                Join
              </Link>
            </>
          )}
        </div>
        <Sheet>
          <SheetTrigger className="md:hidden" render={<Button variant="ghost" size="icon" />}>
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent className="flex flex-col gap-4 p-6">
            {memberLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-lg">
                {link.label}
              </Link>
            ))}
            {member && member.role !== "ADMIN"
              ? pinLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="text-lg">
                    {link.label}
                  </Link>
                ))
              : null}
            {member ? (
              <Button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                Sign out
              </Button>
            ) : (
              <Link href={isApp ? "/login" : "/register"} className={buttonVariants()}>
                {isApp ? "Sign in" : "Become a distributor"}
              </Link>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
